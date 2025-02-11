import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AskAiDto } from './dto/create-ai.dto';
import { UpdateAiDto } from './dto/update-ai.dto';
import OpenAI from "openai";
import { PassThrough, Stream } from 'stream';
import { write, WriteStream } from 'fs';

@Injectable()
export class AiService {
  private openai: OpenAI;
  private assistant: OpenAI.Beta.Assistants.Assistant;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY')
    });

    this.createAssistant();
  }

  async createAssistant() {
    this.assistant = await this.openai.beta.assistants.create({
      name: "Event Assistant",
      instructions: `You are an Event Assistant specialized in social events, like: weddings, fifteen years, baptisms, graduations, etc.
        Help users with questions about:
        - Event planning and scheduling
        - Guest management
        - Wedding traditions and etiquette
        - Event logistics and coordination

        Be friendly and professional. If asked about topics unrelated to events,
        politely redirect the conversation back to event-related topics.
        
        If you suggest or are asked about how to send invitations, clarify that it's as simple as sending the app link to the guests, they can confirm the attendance and even record a video message for the event organizer.

        If you suggest or are asked about how to send reminders, clarify that the app will send reminders to the guests a few days before the event.

        If you suggest or are asked about how to send thank you messages, clarify that within the app there is an option to record the video message if the event organizer chose the VIP plan.
        `,
      model: "gpt-4o-mini"
    });
    console.log("AI Assistant created");

  }

  async askAI(msg: string) {
    try {
      const thread = await this.openai.beta.threads.create();
      const message = await this.openai.beta.threads.messages.create(
        thread.id,
        {
          role: "user",
          content: msg
        }
      );

      const run = await this.openai.beta.threads.runs.create(
        thread.id,
        { assistant_id: this.assistant.id }
      );

      // Wait for the run to complete
      let runStatus = await this.openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );

      while (runStatus.status !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(
          thread.id,
          run.id
        );
      }

      const messages = await this.openai.beta.threads.messages.list(thread.id);
      const response = messages.data[0].content[0]['text'].value;

      const payload = {
        message: `${response}`
      };

      return payload;
    } catch (error) {
      console.error(error);
    }
  }

  findAll() {
    return `This action returns all ai`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ai`;
  }

  update(id: number, updateAiDto: UpdateAiDto) {
    return `This action updates a #${id} ai`;
  }

  remove(id: number) {
    return `This action removes a #${id} ai`;
  }
}
