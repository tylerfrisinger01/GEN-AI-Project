import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "langchain";

const openAiApiKey = process.env.REACT_APP_OPENAI_API_KEY;

if (!openAiApiKey) {
  console.warn(
    "Missing REACT_APP_OPENAI_API_KEY. LangChain calls will fail until it is provided."
  );
}

const model = new ChatOpenAI({
  model: "gpt-4.1",
  apiKey: openAiApiKey,
});

async function generateHomeResponse(userPrompt, systemPrompt = null) {
  try {
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


async function generateSearchResponse(userPrompt, systemPrompt = null) {
  try {
    const systemMsg = typeof systemPrompt === "string"
      ? new SystemMessage(systemPrompt)
      : systemPrompt;

    const messages = [
      systemMsg || new SystemMessage(
        "You are a helpful assistant that helps create recipes based on their dietary preferences." +
        "and only using ingredients that they give you. If no ingredients or dietary preferences are given, you should should return a list of recipes" +
        "that are similar to the recipe name they entered. If no recipes can be created, you should say that no recipes can be created and return a list of recipes that" +
        "are similar to what they asked for."
      ),
      new HumanMessage(userPrompt),
    ];

    const response = await model.invoke(messages);
    
    return response.text ?? response;
  } catch (error) {
    console.error("Error invoking model:", error);
    return "";
  }
}


export { generateSearchResponse };
export { generateHomeResponse as getAiResponse };
