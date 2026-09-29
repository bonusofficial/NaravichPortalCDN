import { BlockList, isIP } from 'node:net';

function normalize(ip: string): string {
  return ip.replace(/^::ffff:/, '');
}

export function isValidIpRule(rule: string): boolean {
  const [address, prefixText, extra] = rule.split('/');
  const family = isIP(normalize(address));
  if (!family || extra !== undefined) return false;
  if (prefixText === undefined) return true;
  const prefix = Number(prefixText);
  return (
    Number.isInteger(prefix) &&
    prefix >= 0 &&
    prefix <= (family === 4 ? 32 : 128)
  );
}

export function ipMatchesAny(ip: string, rules: string[]): boolean {
  const address = normalize(ip);
  const family = isIP(address);
  if (!family) return false;
  return rules.some((rule) => {
    if (!isValidIpRule(rule)) return false;
    const [network, prefixText] = rule.split('/');
    const networkFamily = isIP(normalize(network));
    if (networkFamily !== family) return false;
    const list = new BlockList();
    if (prefixText === undefined)
      list.addAddress(normalize(network), family === 4 ? 'ipv4' : 'ipv6');
    else
      list.addSubnet(
        normalize(network),
        Number(prefixText),
        family === 4 ? 'ipv4' : 'ipv6',
      );
    return list.check(address, family === 4 ? 'ipv4' : 'ipv6');
  });
}
