import 'dotenv/config';
import { hash } from 'bcryptjs';
import dataSource from './data-source';
import { UserRole } from '../common/enums';
import { User } from '../modules/users/entities/user.entity';

async function seed(): Promise<void> {
  await dataSource.initialize();
  const users = dataSource.getRepository(User);
  const email = (
    process.env.SEED_ADMIN_EMAIL ?? 'admin@naravich.local'
  ).toLowerCase();
  const existing = await users.findOne({ where: { email } });

  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error('SEED_ADMIN_PASSWORD must contain at least 10 characters');
  }

  await users.save(
    users.create({
      name: process.env.SEED_ADMIN_NAME ?? 'Local Administrator',
      email,
      passwordHash: await hash(password, 12),
      mustChangePassword: true,
      role: UserRole.ADMIN,
      isActive: true,
      mfaEnabled: false,
    }),
  );

  console.log(`Created admin: ${email}`);
}

void seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });
