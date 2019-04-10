import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib';
import * as azdev from 'azure-devops-node-api';
import TaskVariable from './TaskVariable';
import AuthenticationProvider from './AuthenticationProvider';
import Changelog from './Changelog';

async function main(): Promise<void> {
    try {
        let variables: TaskVariable = new TaskVariable();
        variables.load();

        let azdevAuth: AuthenticationProvider = new AuthenticationProvider(variables.system);
        let connection: azdev.WebApi = azdevAuth.getConnection();
        let changelog: Changelog = new Changelog(connection, variables);

        await changelog.loadBuildSummary();
        await changelog.loadWorkItems();
        await changelog.loadChangsets();

        let releaseNotes: string = changelog.toString();
        console.log(releaseNotes);

        tl.mkdirP(path.parse(variables.input.filePath).dir);
        tl.writeFile(variables.input.filePath, releaseNotes);

        console.log(`The file ${variables.input.filePath} saved.`);
    } catch (error) {
        tl.error(error);
    }
}

main();