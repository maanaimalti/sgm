import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Plain passport-local guard: LocalStrategy validates the credentials and puts
 * the resulting user on the request.
 *
 * It used to override canActivate to stuff the raw body onto `request.user` and
 * return the request object (truthy, so the guard always passed). Credentials
 * were still checked further in, but nothing in the guard did it.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {}
