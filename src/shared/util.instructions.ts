import { DEFAULT_INSTRUCTION_CONFIG, InstructionConfig } from "./type.instructions.js";

export function normalizeInstructionConfig(config?: Partial<InstructionConfig> | null): InstructionConfig {
  return InstructionConfig.parse({
    ...DEFAULT_INSTRUCTION_CONFIG,
    ...config,
    defaults: {
      ...DEFAULT_INSTRUCTION_CONFIG.defaults,
      ...(config?.defaults ?? {}),
    },
  });
}

export function buildInstructionText(config: InstructionConfig): string {
  return config.intro.trim();
}
