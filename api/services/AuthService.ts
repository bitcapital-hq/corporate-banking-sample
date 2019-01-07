import { Repository, getRepository } from "../../node_modules/typeorm";
import { BaseRequest, BaseResponse, HttpCode, HttpError } from 'ts-framework';
import { Person, Session, Company } from "../models";
import { authenticateUser } from "../../config";
import PersonService from "./PersonService";
import DomainService from "./DomainService";

export default class AuthService {

    private sessionRepository: Repository<Session>;
    private static instance: AuthService;
    private personService: PersonService;

    constructor() {
        this.sessionRepository = getRepository(Session);
        this.personService = PersonService.getInstance();
    }

    private static initialize() {
        AuthService.instance = new AuthService();
    }

    public static getInstance(): AuthService {
        if(!AuthService.instance)
            AuthService.initialize();
        
        return AuthService.instance;
    }

    public async login(email: string, password: string): Promise<Session> {
        const person = await this.personService.findByEmail(email);
    
        if(!person) 
          throw new HttpError("Not found", HttpCode.Client.NOT_FOUND);
    
        if(!person.validatePassword(password))
          throw new HttpError("Unauthorized: invalid password", 
          HttpCode.Client.UNAUTHORIZED);
    
        const user = await authenticateUser(person);
    
        const session = new Session({
          email: person.email,
          token: user.credentials.accessToken
        });
    
        return await this.sessionRepository.save(session);
      }

      public async logout(req: BaseRequest, res: BaseResponse): Promise<boolean> {
        const session = await this.getSession(req);
        if(!session)
            throw new HttpError("Not authorized", HttpCode.Client.BAD_REQUEST);

        await this.sessionRepository.delete(session.id);
        res.removeHeader('Authorization');

        return true;
    }

    public async validate(token: string): Promise<boolean> {
        const session = await this.findByToken(token);
        if(!session) return false;
    
        return true;
    }

    public async getSession(req: BaseRequest): Promise<Session> {
        let accessToken = req.headers["authorization"];
        if(!accessToken)
            throw new HttpError("Not logged in", HttpCode.Client.UNAUTHORIZED);

        accessToken = accessToken.toString().split(/\s+/).pop();
        return await this.findByToken(accessToken);
    }

    public async authorize(req: BaseRequest, res: BaseResponse): Promise<[Company, Person]> {
        const session = await this.getSession(req);

        if(!session)
            throw new HttpError("Not authorized", HttpCode.Client.UNAUTHORIZED);

        /* 
        * TODO
        * check/validate token using /me
        */

        const currentUser = await this.personService.findByEmail(session.email);
        await authenticateUser(currentUser);
        
        res.setHeader("Authorization", `Bearer ${session.token}`);

        const domain = currentUser.sender ||
        await DomainService.getInstance().findByAccountable(currentUser.id);

        return [ domain, currentUser ];
    }

    public async findByToken(token: string): Promise<Session> {
        return await this.sessionRepository
        .findOne({ 
            where: { token: token } 
        });
    }

}