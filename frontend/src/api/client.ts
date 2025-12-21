import axios from 'axios';

const client = axios.create({
    baseURL: '/api', // Vite Proxy를 통해 http://localhost:8080/api 로 전달됨
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;
