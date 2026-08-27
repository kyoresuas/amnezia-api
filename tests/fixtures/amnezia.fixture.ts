import { ClientTableEntry } from "@/types/amnezia";
import { AmneziaBackupData } from "@/types/server";

export const AMNEZIA_WG_CONFIG_FIXTURE = `[Interface]
Address = 10.8.1.1/24
ListenPort = 51820
Jc = 4
Jmin = 40
Jmax = 70
S1 = 15
S2 = 20
S3 = 20
S4 = 23
H1 = 1
H2 = 2
H3 = 3
H4 = 4
I1 = <r 2>
I2 = test-2
I3 = test-3
I4 = test-4
I5 = test-5

[Peer]
PublicKey = active-id
AllowedIPs = 10.8.1.2/32

[Peer]
PublicKey = disabled-id
AllowedIPs = 0.0.0.0/32
`;

export const AMNEZIA_WG3_CONFIG_FIXTURE = `[Interface]
PrivateKey = server-private-key
Address = 10.8.1.1/24
ListenPort = 51820
Jc = 3
Jmin = 10
Jmax = 30
S1 = 15
S2 = 20
S3 = 20
S4 = 23
H1 = 1148536102
H2 = 1330170476
H3 = 1521576194
H4 = 1571084247
HeaderProtectionKey = tR8mQ2xVb4Nc7Kd9Lf1Hg3Jp5Rt6Yu8Iw0Oz2As4Ex=
ContentPaddingAddition = 10-100
RekeyAfterTime = 100-120
RekeyTimeout = 3-7
RejectAfterTime = 150-180
KeepaliveTimeout = 5-15
MaxHandshakeAttempts = 15-20
RandomTrailers = on
DisableCookies = on
# I1 = <r 2><b 0x858000010001000000000669636c6f756403636f6d0000010001c00c000100010000105a00044d583737>

[Peer]
PublicKey = active-id
AllowedIPs = 10.8.1.2/32

[Peer]
PublicKey = disabled-id
AllowedIPs = 0.0.0.0/32
`;

export const AMNEZIA_WG_DUMP_FIXTURE = [
  "active-id\tpsk\t198.51.100.10:51820\t10.8.1.2/32\t0\t100\t200\t25",
  "disabled-id\tpsk\t(none)\t0.0.0.0/32\t0\t0\t0\t25",
].join("\n");

/**
 * Создать фикстуру таблицы клиентов AmneziaWG
 */
export const createAmneziaClientsTableFixture = (): ClientTableEntry[] => [
  {
    clientId: "active-id",
    userData: {
      clientName: "alice [macbook]",
      allowedIp: "10.8.1.2",
      expiresAt: 4_102_444_800,
    },
  },
  {
    clientId: "disabled-id",
    userData: {
      clientName: "bob",
      allowedIp: "10.8.1.3",
      expiresAt: 1_700_000_000,
    },
  },
];

/**
 * Создать фикстуру резервной копии AmneziaWG
 */
export const createAmneziaBackupFixture = (): AmneziaBackupData => ({
  wgConfig: AMNEZIA_WG_CONFIG_FIXTURE,
  clients: createAmneziaClientsTableFixture(),
  serverPublicKey: "server-public-key",
  presharedKey: "preshared-key",
});
