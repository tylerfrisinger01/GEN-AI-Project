import * as z from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "langchain";

//const openAiKey = env.OPENAI_API_KEY;



const model = new ChatOpenAI({
  model: "gpt-4.1",
  apiKey: "",
});


const systemMsg = new SystemMessage("You are a helpful assistant that helps create recipes based on their dietary preferences\
 and only using ingredients that they give you. If no ingredients or dietary preferences are given, you should should return a list of recipes\
 that are similar to the recipe name they entered. If no recipes can be created, you should say that no recipes can be created and return a list of recipes that\
 are similar to what they asked for.");

const messages = [
  systemMsg,
  new HumanMessage("I want to make a vegetarian lasagna made out of concrete and metal beams"),
]
// const response = await model.invoke(messages);

async function getAiResponse() {
  try {
    const response = await model.invoke(messages);
    return response;
  } catch (error) {
    console.error("Error invoking model: ", error);
  }
}


export { getAiResponse };