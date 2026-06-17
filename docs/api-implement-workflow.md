# API implementation workflow

This document will serve as a guide for the AI to implement API in the code base while following all the standard for coding.

## Brief 

The api implementation is a 2 step process `API & Redux code` and `Actual implementation`

### API & Redux code
* This Step invloves adding api endpoint, function, and approrpiate redux code as all the api calling flows through the redux and saga middleware

* The AI Agent is request to edit the following files:

    * `api.ts`

        * Lives in the `src/constants/` folder for the front-end and consists of enpoints mapping for the api as well as base URL config specific to the environment (loc, qa, uat) etc.

        * The base config for the api endpoint must not be changes the but the api endpoint has to be added, the endpoint to be added must be added based on the specified requirement.

        * while adding a new endpoint make sure to follow these standards:

            * using comment to sperate out for which section the api calling will be made for example

                ```js
                {
                    // asset 
                    asset: `api/v1/asset`
                    asset_id: (asset_id: number) => `api/v1/asset/${asset_id}`
                    ... all the asset related apis

                    // digest 
                    digest: 'api/v1/digests',
                    digest_id: (digest_id: number) => `api/v1/digests/${digest_id}/`,
                    ... all the direct related api
                }
                ```

            * naming convention will be ass per endpoint name for example
                
                ```js
                {
                    asset_analysis_market_statistics: (asset_id: number) => `/api/v1/asset/${asset_id}/analysis/market/statistics`
                }
                ```
                
                we can break down the endpoint into `api` + `v1` + `asset` + `{asset_id}` + `analysis` + `market` + `statistics`. so we only pick `asset`, `analysis`, `market`, `statistics`. and put them together seperated by underscore, (snake case)

                here asset_id not needed as after asset id we have other elements
            
            * After the endpoint is added the type interface for the same must be added in the `api-interface.ts` respectively

            * While adding a new edpoint it must added under the appropriate section, for example any api related to organization will always be added along with other organization apis in the same section

            * If the newly added enpoint contains dymanic url param, it must be added as an arrow function which will access the dynamiv url param are function argument and will return the url uving template string where the dynamic element will be passed using `${}` 


    * `api-interface.ts`

        * Lives in the `src/interface/` folder and is responsible for maintaining all the types for api config and well type for api contracts, that is api request and response types

        * In this file types for api endpoint will be updated constantly, and this file will follow the same comment + section grouping standard as api.ts

        * The type for api contracts are used to maintain the payload type and response type all in one single object that is tied to a specific api call.

        * For the API contracts type below are the standards that has to be followed:

            * each api contract api are meant to have atleast two keys `payload/params` and `response`

                * `payload/params` will represent the types request param or body to be sent
                * `response` is self explanatory
            
            * sometime is specified in the requirements, `errorResponse` will also be added for error response type.

            * response type is defined for success response from the api and will always use the built-in APIResponse type to define the payload.


            * `params` will be used for GET request while `payload` will be used for POST, PUT, PATCH, DELETE request

            * if any dymanic url parameter is passed in the endpoint for example asset_id, that must be inlcuded in the `payload/params` with snake case.

            * if no payload is specified then feel free to leave the `payload/params` empty in case even if nothing has to be passed inside the dynamic url.

            * The name of the type object holding the types for api constract must following the same naming convention, preffixed by action if applicable for post,put,patch,delete request, same name endpoint in PascalCase suffexed by Request, for example 

                ```Javascript

                // asset_analysis_market_statistics <- is the endpoint

                export interface AssetAnalysisMarketStatisticsRequest { // simple get request
                    params: any  // sample type. used param since its a GET request
                    response: APIResponse<{
                        key1: number,
                        key2: string,
                    }>
                }

                export interface AddAssetRequest { // simple prefixed my action since 
                    payload: any  // sample type, used payload since its a POST request
                    response: APIResponse<any>
                }

                // note APIResponse is wrapper utility type

                /**
                 * here the type for api response for the api is 
                 {
                    status: string,
                    status_code: string,
                    data: {
                        key1: int,
                        key2: string,
                    }
                 }
                */

                ```
            
            * Must use `interface` keyword instead of `type`

            * In this file all the api contracts types are group into diff section just like in api.ts via comments, for example

                ```js
                // ===============================
                //  <Module_Name> related apis
                // ===============================
                ```

                while adding a new api contract make sure to add it under its approritate section
            
            * if the api does not return any data, only status and status_code, then you are support to put only APIResponse as the type for response

                ```js
                export interface AssetAnalysisMarketStatisticsRequest {
                    payload: any  // sample type
                    response: APIResponse  // sample type
                }

                /**
                 * here the type for api response for the api is 
                 {
                    status: string,
                    status_code: string,
                    // no data
                 }
                */

                ```
            
            * For download api contract, add `fileName` inside the `params/payload` which will be used to put the name of the file while downloading the blob. 

            * For download api, `response` is not not needed in api contract interface.
    
    * `index.ts`

        * This is where the api calling function are written, Lives in `src/service/api/` folder,
        * There are mainly two types of config in the patform, `axiosConfig` for making normal api call, `fetchConfig` for making special fetch request, (downloading blob)

        * When api contract for normal json data, use `axiosConfig`, else if api is specifically for downloading file use `fetchConfig`

        * Below are the conding standard that has to be followed

            * The appropriate type/interface for the api call must be imported from the `@/interface` module defined in api-interface.ts and used in the code.

            * The api function must use the approriate config as per requirements to make the api call as disucess in the above point.
            * The api function must only accept one parameter, the name of the parameter/argument can be based on the type of network request made and the paramter must be annotated with the `payload/params` type from the type/interface imported from api-interface.

            * The name of the function paramer will be **params** for `GET` api request, and **payload** for `POST`, `PUT`, `PATCH`, `DELETE` requests
            
            * the function naming convention will be `<requestType>` followed by the overall endpoint name, feel free to name it however you want but it must be relevalnt to the its purpose. must follow camelCase

            * Inside the function, the payload/params must be destructure to extract any paramer or dumanic values to be passed into api endpoint, while the remaning values are kept inside rest using spread operator. then rest is then passed in api call as `params` for GET request, and `data` for other request.

            * for example

                ```js   
                    import {AssetAnalysisMarketStatisticsRequest, AddAssetRequest} from "@/interface";
                    import {createAxiosInstance} from './axiosConfig';

                    async function getAssetMarketStatistics(params: AssetAnalysisMarketStatisticsRequest['params']){
                        const {assetId, ...rest} = params;
                        return await createAxiosInstance({
                            url: API.authUrls.asset_analysis_market_statistics(assetId),
                            method: 'GET',
                            headers: {...authHeaders},
                            params: rest, // passed into params since request is GET
                        })
                    }

                    async function addAsset(payload: AddAssetRequest['payload']){
                        const {assetId, ...rest} = payload;
                        return await createAxiosInstance({
                            url: API.authUrls.asset_analysis_market_statistics(assetId),
                            method: 'POST',
                            headers: {...authHeaders},
                            data: rest,  // passed into data since request is POST
                        })
                    }

                    // for download apis
                    export async function downloadAssetIndustryBenchmarkAnalysis(
                        params: AssetIndustryBenchmarkAnalysisExportRequest['params'],
                    ) {
                        const {assetId, fileName, ...rest} = params;
                        await fetchAndDownloadBlob({
                            url: API.authUrls.asset_analysis_benchmark_industry_export(assetId),
                            filename: fileName,
                            params: rest,
                        });
                    }

                ```
            

    * `slice-interface.ts`

        * **IGNORE THIS FILE IF THE API IMPLEMENT WAS FOR DOWNLOADING SOME FILE**

        * This is where the types for the slice are maintained, Lives inside `src/interface/`, this file is not be touched as much and must be edited by author who will finallize the new structure for slice.

        * You are not allowed to edit this file.
    
    * `<moduleName>slice.ts`
         * **IGNORE THIS FILE IF THE API IMPLEMENT WAS FOR DOWNLOADING SOME FILE**
        * These are the slice files, lives inside the `src/services/redux/slice/` where the entire slice code is maintained

        * This project is configured with redux-saga middleware. here saga is primarily used for api calling.

        * In redux we mainly maintain three types of reducer functions. 

            * request

                * This trigger the generator function configured in saga that is responsible for actual api call
                * Intitiallized any loading variable associated with the functionality to true
                * Resets any success/failure state in the slice to false (clean up before any api call).

            * success

                * Triggerd by saga.
                * reset all the loading state back to to false
                * updated the success state with the success code returned by api call
                * additionally, reads the data returned from the api call and update the redux slice accordingly.

            * failure

                * Triggerd by saga.
                * reset all the loading state back to to false
                * updated the failure state with the error code returned by api call
                * additionally, reads the error related data from the api call and update the redux slice for error accordingly.

        
        * Along with these we also maintain some utility reducer to directly modify the redux slice, but those are not to be looked into

        * Follow these conding standard while adding the reducer function inside the slice.

            * Each reducer group (request, success, failure) must be rendered in there dedicated section, all the reducer group must be well seperate by following comments

                ```js
                // =====================================
                // <functionality name> api
                // =====================================

                // for example
                {
                    // =====================================
                    // get asset market statistics api
                    // =====================================
                    getAssetMarketStatisticsRequest(state, action){
                        // code
                    },

                    getAssetMarketStatisticsSuccess(state, action){
                        // code
                    },
                    getAssetMarketStatisticsFailure(state, action){
                        // code
                    },

                    // =====================================
                    // add asset api
                    // =====================================
                    addAssetRequest(state, action){
                        // code
                    },

                    addAssetSuccess(state, action){
                        // code
                    },
                    addAssetFailure(state, action){
                        // code
                    },
                }
                ```

            * Always place any new reducer group before the `utility` section starts, **do not append any new reducer after the `utility`** section

            * Before adding the reducer, make sure to import the api contract type/interface from `@/interface` module that we defined earlier to use it here.

            * Always add type for action object using the interface defined in the api-interface for the api contract, 

                * for `request` reducer, use the `params/payload` type of the api contract interface, 
                * for `success` reducer, use the `response` type for the api contract interface,
                * for `error` reducer, use the `APIResponse` generic type for action object, however if `errorResponse` type is specified in api contract that use that instead,

                * never use `any` type for action payload unless nothing is specified, or type if unknown

                ```javascript
                addAssetRequest(state, action: PayloadAction<AddAssetRequest['payload']>){
                    // code
                },

                addAssetSuccess(state, action: PayloadAction<AddAssetRequest['response']>){
                    // code
                },
                addAssetFailure(state, action: PayloadAction<APIResponse>){
                    // code
                },
                ```
            
            * action parameter for request reducer must be prefixed with underscore (_) since the action will not be used in the reducer function, its only added so that the saga function can read the action payload and pass it into api function.
            
            * Since the data part in api response is declared as optional, always wrape the data updation part for success reducer in a if statement to guard the type safety

                ```javascript
                addAssetSuccess(state, action: PayloadAction<AddAssetRequest['response']>){
                    state.isLoading = false;
                    state.assetSuccess = action.payload.status_code;
                    
                    // since data is optional type in APIResponse, always wrap inside statement to prevent lint error in typescript
                    if (action.payload.data){
                        // code
                    }
                },
                ```

            * While exporting the reducer functions, make sure to group them by adding comment to indicate which api reducer they are

                ```js
                export const {
                    // add asset
                    addAssetRequest,
                    addAssetSuccess,
                    addAssetFailure,

                    // asset market analysis
                    getAssetMarketStatisticsRequest,
                    getAssetMarketStatisticsSuccess,
                    getAssetMarketStatisticsFailure,

                    // rest of the code
                } = slice.action;
                ```

            * The naming convention for reducer must be same as the api function declared in the `src/services/api/index.ts` suffixed by the `request` or `success` or `failure` all using camel case

            * Inside reducer do not try to modify array like data using inline function such as push, pop, slice, instead of manually mutate the array or object using loop, map, filter and spread operator

            * Make sure the slice is well populated with initial/empty data as updated in the slice-interface by the author.
    
    * `<moduleName>saga.ts`
        * **IGNORE THIS FILE IF THE API IMPLEMENT WAS FOR DOWNLOADING SOME FILE**
        * These are the saga files, lives inside the `src/services/redux/saga/` folder where the entire saga code is maintained

        * These file primary maintain two types of generator function.

            * Root Generator 

                * Orchestrates all the api call centrally by registering them with the request reducer for the specific api call.
                * Each Saga will have only one root generator function per file.
            
            * API calling Sagas

                * Main generator function responsible for actual api calling functionality.
                * Typical syturcture looks something like this

                    ```js
                    function* AddAssetSaga(action: ReturnType<typeof addAssetRequest>): Generator {
                        try {
                            const response: any = yield call(addAsset, action.payload);
                            if (response.data.status === SUCCESS_KEY) {
                            yield put(addAssetSuccess(data: response.data));
                            } else {
                            yield put(addAssetFailure(response.data));
                            }
                        } catch (error: any) {
                            yield put(addAssetFailure(error.response?.data || error.response));
                        }
                    }
                    ```
                
                * Here a try/catch block is added to wrap the full functionality for api call
                * Inside the try catch is the core api calling, error, and success response handling
                * response is fetched and anotated with `any` type.
                * based on the of the api response was success or not, accordingly the success and failre reducers are called
                * in the catch block at last, the failure reuder is called where the response from the error object is passed.
            
            * Below are the coding standards to be followed for updating this file.

                * Saga function must follow PascalCase convention and the name of the function must be same as api function suffizex with "Saga"
                * Saga function must always be type anotated with `Generator` type
                * Saga function's action parameter must be anotated with the return type of the request reducer to match the same type 

                * Saga function must specify the type of the error in try/catch as `any`
            
                * While importing the reducer function from slice, in the import statement same comment + grouping standard must be followed while exporting the reducer function from slice. 

                * After the saga function is added make sure to register the saga function in the Root Generator of the file to actually link the request reducer with Saga function.

    * ``<moduleName>selector.ts``
        * **IGNORE THIS FILE IF THE API IMPLEMENT WAS FOR DOWNLOADING SOME FILE**
        * These are the selector files, lives inside the `src/services/redux/selector/` folder where the entire selector code for the slices is maintained.
        * must be updated with the required selector after the api call is done


* Once all the files are updated success marks the success for this step.

**STRICT RULES**
    * Never modify `src/interface/common-interface.ts` and `src/interface/slice-interface.ts`, if any changes has to be added then please as user / author to do it while also suggesting the changes to be done before proceeding to modify the files.

    * make sure the comment statndard for grouping is strictly followed, If any old code did not followed this coding standard then make sure to also update it specially in the slice and saga.

    * DO not modify or typecast the initial state in the slice with any if any lint error is comming, (that will probably come if the Agent(you) tries to modify the slice structure without waiting for user to update the slice-interface with newly updated types which must be done manually.)

    * DO not use 
        ```js
        (state.<propertyName> as any)?.anotherproperty = something
        ```

        hack to ditch typescript issues because you did not followed the previous step guideline.
