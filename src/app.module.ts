import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorldModule } from './world/world.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.DB_URL || ''),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || '',
    }),
    WorldModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
