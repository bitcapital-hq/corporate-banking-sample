import { Company, Person } from "../../../models";
import { Domain, DomainRole, User, UserRole } from "bitcapital-core-sdk";
import { DomainService } from "../../../services";

export default class CompanyMapper {

    public toDomain(company: Company): Domain {
        return new Domain({
            id: company.externalId
            //name: company.name,
            //role: DomainRole.COMMON,
            //urls: [ company.website ]
        });
    }

    public async toMediator(company: Company): Promise<User> {
        const person = await DomainService.getInstance().findAccountable(company.id);
        return new User({
            domain: this.toDomain(company),
            firstName: person.firstName,
            email: person.email,
            lastName: person.lastName,
            password: person.passwordHash,
            role: UserRole.MEDIATOR
        });
    }

    public fromMediator(mediator: User): Person {
        return new Person({
            externalId: mediator.id,
            firstName: mediator.firstName,
            lastName: mediator.lastName,
            email: mediator.email
        });
    }

    public fromDomain(domain: Domain): Company {
        return new Company({
            externalId: domain.id,
            name: domain.name,
            website: domain.urls[0]
        });
    }
}