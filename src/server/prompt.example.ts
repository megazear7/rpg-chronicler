import { ChatCompletionMessageParam } from "openai/resources";
import { MessageType } from "../shared/type.model.js";

export const examplePrompt = async (instructions: string): Promise<ChatCompletionMessageParam[]> => {
  return [
    {
      role: MessageType.enum.user,
      content: "Say hello to the world.",
    },
    {
      role: MessageType.enum.user,
      content: `Please follow these instructions: ${instructions}`,
    },
  ];
};
