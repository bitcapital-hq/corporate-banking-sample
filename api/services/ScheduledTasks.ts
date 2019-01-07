import { DomainService, PaymentService, PersonService } from ".";

export default class ScheduledTasks {

    private static instance: ScheduledTasks;

    constructor() {
        // ?
    }

    public static initialize() {
        if(!ScheduledTasks.instance) {
            ScheduledTasks.instance = new ScheduledTasks();
            ScheduledTasks.instance.scheduleTasks();
        }
    }

    private scheduleTasks() {
        
    }
}