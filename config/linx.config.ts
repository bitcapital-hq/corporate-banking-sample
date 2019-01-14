export default {
    credentials: {
        baseURL: process.env.LINX_BASE_URL,
        clientId: process.env.LINX_CLIENT_ID,
        clientSecret: process.env.LINX_CLIENT_SECRET 
    },
    mediatorLogin: process.env.LINX_MEDIATOR_LOGIN,
    mediatorPassword: process.env.LINX_MEDIATOR_PASSWORD
};