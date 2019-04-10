import * as tl from 'azure-pipelines-task-lib';
import * as azdev from 'azure-devops-node-api';
import { IRequestHandler } from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';
import SystemVariable from './SystemVariable';

export default class AuthenticationProvider {
    private readonly collectionUri: string;
    private readonly accessToken: string;

    constructor(system: SystemVariable) {
        this.collectionUri = system.collectionUri;
        this.accessToken = system.accessToken;
    }

    public getConnection(): azdev.WebApi {
        if (process.env.TF_BUILD) {
            return this.getVssConnection();
        }
        return this.getPatConnection();
    }

    public getPatConnection(accessToken?: string): azdev.WebApi {
        return this.webApi(this.collectionUri, azdev.getHandlerFromToken(accessToken ? accessToken : this.accessToken));
    }

    public getEndpointConnection(): azdev.WebApi {
        let endpointName: string = tl.getInput('connectedServiceName', true);
        let endpointUrl: string = tl.getEndpointUrl(endpointName, false);
        let endpointAuth: tl.EndpointAuthorization = tl.getEndpointAuthorization(endpointName, false);
        let endpointUsername: string = endpointAuth.parameters['username'];
        let endpointPassword: string = endpointAuth.parameters['password'];

        if (endpointPassword.match(RegExp('^[a-zA-Z0-9]{52}$'))) {
            return this.webApi(endpointUrl, azdev.getPersonalAccessTokenHandler(endpointPassword));
        } else {
            return this.webApi(endpointUrl, azdev.getBasicHandler(endpointUsername, endpointPassword));
        }
    }

    public getBasicConnection(username: string, password: string): azdev.WebApi {
        return this.webApi(this.collectionUri, azdev.getBasicHandler(username, password));
    }

    private webApi(url: string, authHandler: IRequestHandler): azdev.WebApi {
        return new azdev.WebApi(url, authHandler);
    }

    private getVssConnection(): azdev.WebApi {
        let vssToken: string = tl.getEndpointAuthorizationParameter('SystemVssConnection', 'AccessToken', false);
        return this.webApi(this.collectionUri, azdev.getHandlerFromToken(vssToken));
    }
}