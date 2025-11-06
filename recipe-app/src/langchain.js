import * as z from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, tool } from "langchain";



const model = new ChatOpenAI({
  model: "gpt-4.1",
  apiKey: "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",
});

const response = await model.invoke("Generate me a vegan lasagna recipe");

console.log(
  response
);