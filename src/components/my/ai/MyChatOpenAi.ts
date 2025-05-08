import {ChatOpenAI} from "@langchain/openai";
export class MyChatOpenAi extends ChatOpenAI {
    _convertOpenAIDeltaToBaseMessageChunk(
        delta:any, rawResponse:any, defaultRole:any) {
        const messageChunk = super._convertOpenAIDeltaToBaseMessageChunk(delta, rawResponse, defaultRole);
        messageChunk.additional_kwargs.reasoning_content = delta.reasoning_content;
        return messageChunk;
    }
    _convertOpenAIChatCompletionMessageToBaseMessage(message:any, rawResponse:any) {
        const langChainMessage = super._convertOpenAIChatCompletionMessageToBaseMessage(message, rawResponse);
        langChainMessage.additional_kwargs.reasoning_content =
            message.reasoning_content;
        return langChainMessage;
    }
}