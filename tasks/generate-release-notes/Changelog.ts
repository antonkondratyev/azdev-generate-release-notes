import * as os from 'os';
import * as azdev from 'azure-devops-node-api';
import * as vss from 'azure-devops-node-api/interfaces/common/VSSInterfaces';
import { BuildApi } from 'azure-devops-node-api/BuildApi';
import { Build, Change } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import { IWorkItemTrackingApi } from 'azure-devops-node-api/WorkItemTrackingApi';
import { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import { ITfvcApi } from 'azure-devops-node-api/TfvcApi';
import { TfvcChangeset } from 'azure-devops-node-api/interfaces/TfvcInterfaces';
import { IGitApi } from 'azure-devops-node-api/GitApi';
import { GitCommit } from 'azure-devops-node-api/interfaces/GitInterfaces';
import TaskVariable from './TaskVariable';

export default class Changelog {
    private readonly _connection: azdev.WebApi;
    private _variables: TaskVariable;
    private _buildApi: BuildApi;
    private _build: Build;
    private _sourceVersion: string;
    private _workItems: string;
    private _changsets: string;

    constructor(connection: azdev.WebApi, variables: TaskVariable) {
        this._connection = connection;
        this._variables = variables;
    }

    public async loadBuildSummary(): Promise<void> {
        this._buildApi = await this._connection.getBuildApi();
        this._build = await this._buildApi.getBuild(this._variables.build.buildId, this._variables.system.teamProject);
        this._sourceVersion = this._build.repository.type === 'TfsGit' ? this._build.sourceVersion.substr(0,8) : this._build.sourceVersion;
    }

    public async loadWorkItems(): Promise<void> {
        let buildWorkItemsRefs: vss.ResourceRef[] = await this._buildApi.getBuildWorkItemsRefs(this._variables.system.teamProject, this._build.id, 1000);
        let buildWorkItemsId: number[] = buildWorkItemsRefs.map(wi => Number(wi.id));

        if (buildWorkItemsId.length !== 0) {
            let wiApi: IWorkItemTrackingApi = await this._connection.getWorkItemTrackingApi();
            let workItems: WorkItem[] = await wiApi.getWorkItems(buildWorkItemsId, ['System.Title', 'System.WorkItemType']);

            this._workItems = workItems
                .filter(wi => wi.fields['System.WorkItemType'] == 'Task' || wi.fields['System.WorkItemType'] == 'Bug')
                .map(wi => `${wi.fields['System.WorkItemType'].replace('Bug', 'Bug ')} ${wi.id} | ${wi.fields['System.Title']}`)
                .join(os.EOL);
        } else {
            this._workItems = 'No associated work items found for this build.';
        }
    }

    public async loadChangsets(): Promise<void> {
        let buildChanges: Change[] = await this._buildApi.getBuildChanges(this._variables.system.teamProject, this._build.id, null, 1000);

        if (buildChanges.length !== 0) {
            let changesPromise: Promise<string>[] = buildChanges.map(async change => {
                if (this._build.repository.type === 'TfsVersionControl') {
                    let changesetId: number = Number(change.id.substr(1));
                    let tfvcApi: ITfvcApi = await this._connection.getTfvcApi();
                    let changeset: TfvcChangeset = await tfvcApi.getChangeset(changesetId, this._variables.system.teamProject, null, null, null, 100000);
                    return `${changesetId} | ${changeset.comment}`;
                } else if (this._build.repository.type === 'TfsGit') {
                    let gitApi: IGitApi = await this._connection.getGitApi();
                    let commit: GitCommit = await gitApi.getCommit(change.id, this._build.repository.id, this._variables.system.teamProject, 100000);
                    let commitId: string = change.id.substr(0,8);
                    let commitComment: string = commit.comment.split('\n').filter(Boolean).join(os.EOL);
                    return `${commitId} | ${commitComment}` + os.EOL;
                } else {
                    console.log(`Not supported for ${this._build.repository.type} repository.`);
                    process.exit();
                }
            });

            this._changsets = (await Promise.all(changesPromise)).join(os.EOL);
        } else {
            this._changsets = 'No changes associated with this build.';
        }
    }

    public toString(): string {
        let releaseNotes: string = '';

        releaseNotes += `Source Branch: ${this._build.sourceBranch}` + os.EOL;
        releaseNotes += `Source Version: ${this._sourceVersion}` + os.EOL;
        releaseNotes += `Requested By: ${this._build.requestedFor.displayName}` + os.EOL;
        releaseNotes += os.EOL;
        releaseNotes += `Associated Work Items` + os.EOL;
        releaseNotes += `${this._workItems}` + os.EOL;
        releaseNotes += os.EOL;
        releaseNotes += `Associated Changes` + os.EOL;
        releaseNotes += `${this._changsets}` + os.EOL;

        return releaseNotes;
    }
}