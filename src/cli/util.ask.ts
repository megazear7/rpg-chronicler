import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function ask(skipPrompts: boolean, question: string, defaultAnswer?: string): Promise<string> {
  if (skipPrompts) {
    return defaultAnswer || "";
  }
  return new Promise((resolve) => {
    rl.question(question + (defaultAnswer ? ` (default: ${defaultAnswer})` : "") + ": ", (answer) => {
      resolve(answer || defaultAnswer || "");
    });
  });
}

export async function closeAsk(): Promise<void> {
  rl.close();
}
