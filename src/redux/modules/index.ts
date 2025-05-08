import aiChatContext from './ai/chat-context.ts';
import {AI_CHAT} from "@/redux/constant.ts";

const reducers = {
    [AI_CHAT]: aiChatContext
}

export default reducers