import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'FinWise API',
    version: '1.0.0',
    description: 'API документация',
  },
  servers: [
    {
      url: 'http://localhost:4000',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      xAuthToken: {
        type: 'apiKey',
        in: 'header',
        name: 'x-auth-token',
      },
    },
  },
};

export const swaggerOptions: swaggerJSDoc.Options = {
  swaggerDefinition,
  apis: ['src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);


