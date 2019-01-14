import { Controller, Post, BaseRequest, BaseResponse } from 'ts-framework';
import { AuthService } from '../services';

@Controller('/')
export default class AuthController {

    @Post("/login")
    public static async login(req: BaseRequest, res: BaseResponse) {
        const { email, password }: { email: string; password: string } = req.body;
      
        const session = await AuthService.getInstance().login(email, password);
        res.setHeader("Authorization", `Bearer ${session.token}`);

        return res.success();
    }  

    @Post("/logout")
    public static async logout(req: BaseRequest, res: BaseResponse) {
        await AuthService.getInstance().logout(req, res);

        return res.success();
    }  
}