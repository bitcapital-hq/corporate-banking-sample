import { Repository, getRepository } from "../../node_modules/typeorm";
import { BaseRequest, BaseResponse, HttpCode, HttpError } from 'ts-framework';
import { Person, Session, Company } from "../models";
import { default as BitCapital } from "../BitCapital";
import PersonService from "./PersonService";
import DomainService from "./DomainService";
import { LoggerInstance } from "ts-framework-common";

export interface AuthServiceOptions {
    logger: LoggerInstance;
}
  
export default class AuthService {

    private logger: LoggerInstance;
    private static instance: AuthService;

    private sessionRepository: Repository<Session>;
    private bitCapital: BitCapital;

    constructor(options: AuthServiceOptions) {
        this.logger = options.logger;
        this.bitCapital = BitCapital.getInstance();
        this.sessionRepository = getRepository(Session);
    }

    public static initialize(options: AuthServiceOptions) {
        if(!AuthService.instance) {
            AuthService.instance = new AuthService(options);
        }
        return AuthService.instance;
    }

    public static getInstance(): AuthService {
        if(!AuthService.instance) {
            throw new Error("AuthService instance not initialized!");
        }
        return AuthService.instance;
    }

    public async login(email: string, password: string): Promise<Session> {
        const person = await PersonService.getInstance().findByEmail(email);
    
        let session: Session;
        try { 
            if(!person) 
            throw new HttpError("Not found", HttpCode.Client.NOT_FOUND);
        
            if(!(await person.validatePassword(password))) {
                throw new HttpError("Unauthorized: invalid password", 
                HttpCode.Client.UNAUTHORIZED);
            }
        
            const user = await this.bitCapital.authenticateUser(person);
        
            session = new Session({
                email: person.email,
                token: user.credentials.accessToken
            });
            await this.sessionRepository.save(session);

        } catch(error) {
            const message = error.message || error.data && error.data.message;
            this.logger.error(`Error creating user session: ${message}`, person.email, error);
            throw error;
        }
  
        return session;
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

        const currentUser = await PersonService.getInstance().findByEmail(session.email);
        await this.bitCapital.authenticateUser(currentUser);
        
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