// ===============================
// 5. 精简版Swagger配置
// src/swagger/swagger.config.ts
// ===============================
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('酒店服务API')
    .setDescription('酒店管理系统接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
    },
    customSiteTitle: '酒店服务API文档',
  });
}
