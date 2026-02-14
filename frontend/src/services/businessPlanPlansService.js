import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';
axios.defaults.withCredentials = true;

export async function listBusinessPlans() {
  const res = await axios.get(`${API_URL}/api/tools/business-plan/plans`);
  return res?.data?.plans || [];
}

export async function getBusinessPlan(id) {
  const res = await axios.get(`${API_URL}/api/tools/business-plan/plans/${id}`);
  return res?.data?.plan;
}

export async function createBusinessPlan(payload) {
  const res = await axios.post(`${API_URL}/api/tools/business-plan/plans`, payload);
  return res?.data?.plan;
}

export async function deleteBusinessPlan(id) {
  const res = await axios.delete(`${API_URL}/api/tools/business-plan/plans/${id}`);
  return res?.data;
}

export async function updateBusinessPlan(id, payload) {
  const res = await axios.patch(`${API_URL}/api/tools/business-plan/plans/${id}`, payload);
  return res?.data?.plan;
}
