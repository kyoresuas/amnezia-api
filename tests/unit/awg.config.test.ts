import {
  readAwgParam,
  parseAwgParams,
  resolveAwgVersion,
  isAwgToggleEnabled,
  dropEmptyConfigLines,
} from "@/helpers/awgConfig";
import { AwgVersion } from "@/types/amnezia";
import { describe, expect, it } from "vitest";
import { AMNEZIA_WG3_CONFIG_FIXTURE } from "../fixtures";

// Конфиг сервера AmneziaWG без обфускации
const PLAIN_CONFIG = `[Interface]
PrivateKey = server-private-key
Address = 10.8.1.1/24
ListenPort = 51820
Jc = 3
Jmin = 10
Jmax = 30
S1 = 15
S2 = 20
H1 = 1
H2 = 2
H3 = 3
H4 = 4
`;

/**
 * Тестирование разбора конфигурации AmneziaWG
 */
describe("awgConfig", () => {
  // Тестирование чтения параметров, в том числе закомментированных
  it("reads active and commented parameters", () => {
    expect(readAwgParam(AMNEZIA_WG3_CONFIG_FIXTURE, "Jc")).toBe("3");
    expect(readAwgParam(AMNEZIA_WG3_CONFIG_FIXTURE, "I1")).toMatch(/^<r 2>/);
    expect(readAwgParam(AMNEZIA_WG3_CONFIG_FIXTURE, "I2")).toBe("");
  });

  // Тестирование разбора параметров конфига 3.1
  it("parses AmneziaWG 3.1 parameters", () => {
    const params = parseAwgParams(AMNEZIA_WG3_CONFIG_FIXTURE);

    expect(params).toMatchObject({
      Jc: "3",
      S3: "20",
      S4: "23",
      H1: "1148536102",
      ContentPaddingAddition: "10-100",
      RekeyAfterTime: "100-120",
      RekeyTimeout: "3-7",
      RejectAfterTime: "150-180",
      KeepaliveTimeout: "5-15",
      MaxHandshakeAttempts: "15-20",
      RandomTrailers: "on",
      DisableCookies: "on",
      I2: "",
      I5: "",
    });
    expect(params.HeaderProtectionKey).not.toBe("");
  });

  // Тестирование отбрасывания непригодных значений I2–I5
  it("skips special junk values broken by config markup", () => {
    const config = `${PLAIN_CONFIG}I2 = # comment\nI3 = [Peer]\nI4 = valid-junk\n`;

    const params = parseAwgParams(config);

    expect(params.I2).toBe("");
    expect(params.I3).toBe("");
    expect(params.I4).toBe("valid-junk");
  });

  // Тестирование того, что закомментированные параметры 3.1 не учитываются
  it("ignores commented AmneziaWG 3.1 parameters", () => {
    const config = `${PLAIN_CONFIG}# RandomTrailers = on\n# RekeyTimeout = 3-7\n`;

    const params = parseAwgParams(config);

    expect(params.RandomTrailers).toBe("");
    expect(params.RekeyTimeout).toBe("");
    expect(resolveAwgVersion(params)).toBeNull();
  });

  // Тестирование определения версии протокола
  it("resolves the protocol version by parameter set", () => {
    expect(resolveAwgVersion(parseAwgParams(PLAIN_CONFIG))).toBeNull();

    expect(
      resolveAwgVersion(parseAwgParams(`${PLAIN_CONFIG}I1 = <r 2>\n`)),
    ).toBe(AwgVersion.V1_5);

    expect(resolveAwgVersion(parseAwgParams(`${PLAIN_CONFIG}S3 = 20\n`))).toBe(
      AwgVersion.V2,
    );

    expect(
      resolveAwgVersion(
        parseAwgParams(PLAIN_CONFIG.replace("H1 = 1", "H1 = 10-20")),
      ),
    ).toBe(AwgVersion.V2);

    expect(resolveAwgVersion(parseAwgParams(AMNEZIA_WG3_CONFIG_FIXTURE))).toBe(
      AwgVersion.V3_1,
    );
  });

  // Тестирование того, что выключенные переключатели не поднимают версию до 3.1
  it("treats disabled toggles as absent parameters", () => {
    const config = `${PLAIN_CONFIG}S3 = 20\nRandomTrailers = off\nDisableCookies = off\n`;

    const params = parseAwgParams(config);

    expect(isAwgToggleEnabled("off")).toBe(false);
    expect(isAwgToggleEnabled("on")).toBe(true);
    expect(isAwgToggleEnabled(" ")).toBe(false);
    expect(params.RandomTrailers).toBe("");
    expect(resolveAwgVersion(params)).toBe(AwgVersion.V2);
  });

  // Тестирование удаления строк без значений
  it("drops config lines without values", () => {
    const config = "[Interface]\nJc = 3\nI2 = \nRandomTrailers =\nS1 = 15\n";

    expect(dropEmptyConfigLines(config)).toBe("[Interface]\nJc = 3\nS1 = 15\n");
  });
});
