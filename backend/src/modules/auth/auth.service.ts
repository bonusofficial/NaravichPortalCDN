import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { generateTotpSecret, verifyTotp } from '../../common/utils/totp';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.mfaSecret')
      .where('LOWER(user.email) = LOWER(:email)', { email: dto.email.trim() })
      .getOne();

    if (
      !user ||
      !user.isActive ||
      !(await compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.mfaEnabled) {
      if (!dto.otp) {
        throw new UnauthorizedException({
          code: 'MFA_REQUIRED',
          message: 'Enter the 6-digit code from your authenticator app',
        });
      }
      if (
        !user.mfaSecret ||
        !verifyTotp(this.decrypt(user.mfaSecret), dto.otp)
      ) {
        throw new UnauthorizedException({
          code: 'MFA_INVALID',
          message: 'The authentication code is invalid or expired',
        });
      }
    }

    user.lastLoginAt = new Date();
    await this.users.save(user);

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: Number(process.env.JWT_EXPIRES_SECONDS ?? 28800),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.isActive)
      throw new UnauthorizedException('User is no longer active');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user || !(await compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (await compare(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException('New password must be different');
    }
    user.passwordHash = await hash(dto.newPassword, 12);
    user.mustChangePassword = false;
    await this.users.save(user);
    return { changed: true };
  }

  async startMfa(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.mfaEnabled)
      throw new BadRequestException('MFA is already enabled');
    const secret = generateTotpSecret();
    user.mfaSecret = this.encrypt(secret);
    await this.users.save(user);
    const label = encodeURIComponent(`Naravich CDN:${user.email}`);
    const issuer = encodeURIComponent('Naravich CDN');
    return {
      secret,
      otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
    };
  }

  async enableMfa(userId: string, code: string) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.mfaSecret')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user?.mfaSecret || !verifyTotp(this.decrypt(user.mfaSecret), code)) {
      throw new BadRequestException(
        'The authentication code is invalid or expired',
      );
    }
    user.mfaEnabled = true;
    await this.users.save(user);
    return { enabled: true };
  }

  async disableMfa(userId: string, code: string) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.mfaSecret')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }
    if (!verifyTotp(this.decrypt(user.mfaSecret), code)) {
      throw new BadRequestException(
        'The authentication code is invalid or expired',
      );
    }
    user.mfaEnabled = false;
    user.mfaSecret = null;
    await this.users.save(user);
    return { enabled: false };
  }

  private encryptionKey(): Buffer {
    return createHash('sha256')
      .update(this.config.getOrThrow<string>('JWT_SECRET'))
      .digest();
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      'base64url',
    );
  }

  private decrypt(value: string): string {
    const payload = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      payload.subarray(0, 12),
    );
    decipher.setAuthTag(payload.subarray(12, 28));
    return Buffer.concat([
      decipher.update(payload.subarray(28)),
      decipher.final(),
    ]).toString('utf8');
  }
}
