import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';

axios.defaults.withCredentials = true;

export async function signup({username,fullname,email,password}){
    const res = await axios.post(`${API_URL}/api/auth/signup`, {
        username,
        fullname,
        email,
        password
    });
    return res.data;
}

export async function login({ username, password }) {
  const res = await axios.post(`${API_URL}/api/auth/login`, {
    username,
    password,
  });
  return res.data; // backend sets cookie + returns user
}

export async function getCurrentUser() {
  const res = await axios.get(`${API_URL}/api/auth/getUser`);
  return res.data;
}

export async function logout() {
  const res = await axios.post(`${API_URL}/api/auth/logout`);
  return res.data;
}

export async function deleteAccount() {
  const res = await axios.delete(`${API_URL}/api/auth/deleteUser`);
  return res.data;
}

export async function updateProfile({ username, fullname } = {}) {
  const res = await axios.patch(`${API_URL}/api/auth/profile`, {
    username,
    fullname,
  });
  return res.data;
}

export async function updatePassword({ currentPassword, newPassword } = {}) {
  const res = await axios.patch(`${API_URL}/api/auth/password`, {
    currentPassword,
    newPassword,
  });
  return res.data;
}