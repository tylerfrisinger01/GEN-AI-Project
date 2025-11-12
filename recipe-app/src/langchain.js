import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "langchain";

// Configure your OpenAI model
const model = new ChatOpenAI({
  model: "gpt-4.1",
  apiKey: "", // make sure to set your key
});

/**
 * Get AI response from LangChain LLM
 * @param {string} userPrompt - The prompt from the user
 * @param {string|SystemMessage} systemPrompt - Optional system prompt
 * @returns {Promise<string>} - AI output text
 */
async function getAiResponse(userPrompt, systemPrompt = null) {
  try {
    // If systemPrompt is a string, wrap in SystemMessage
    const systemMsg = typeof systemPrompt === "string"
      ? new SystemMessage(systemPrompt)
      : systemPrompt;

    const messages = [
      systemMsg || new SystemMessage(
        "You are a helpful assistant that creates recipes based on dietary preferences and ingredients given. " +
        "Return a JSON array of recipes with name, description, ingredients, and steps."
      ),
      new HumanMessage(userPrompt),
    ];

    const response = await model.invoke(messages);
    // LangChain returns an object with text
    return response.text ?? response;
  } catch (error) {
    console.error("Error invoking model:", error);
    return "";
  }
}

export { getAiResponse };
