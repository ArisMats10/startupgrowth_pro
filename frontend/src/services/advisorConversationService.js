import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';
axios.defaults.withCredentials = true;

export async function getLatestAdvisorConversation() {
  const res = await axios.get(`${API_URL}/api/tools/advisor/conversations/latest`);
  return res?.data?.conversation || null;
}

export async function createAdvisorConversation({ messages } = {}) {
  const res = await axios.post(`${API_URL}/api/tools/advisor/conversations`, {
    messages,
  });
  return res?.data?.conversation || null;
}

export async function appendAdvisorConversationMessages({ conversationId, messages } = {}) {
  if (!conversationId) throw new Error('conversationId is required');
  const res = await axios.post(`${API_URL}/api/tools/advisor/conversations/${conversationId}/messages`, {
    messages,
  });
  return res?.data?.conversation || null;
}

export async function deleteAdvisorConversation({ conversationId } = {}) {
  if (!conversationId) throw new Error('conversationId is required');
  await axios.delete(`${API_URL}/api/tools/advisor/conversations/${conversationId}`);
  return true;
}
