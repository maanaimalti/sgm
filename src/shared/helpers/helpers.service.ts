import { Injectable } from "@nestjs/common";
import { ulid } from "ulid";

@Injectable()
export class HelpersService {
  generateId(): string {
    return ulid();
  }
}
