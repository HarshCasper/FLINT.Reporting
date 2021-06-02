import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import { EmissionType } from '../models/emission-type.model';
import { environment } from 'environments/environment';
import { MessageType } from '@common/models/message.type.model';
import { ConnectivityStatusService, MessageService } from '@common/services';
import { catchError, first, takeUntil, tap } from 'rxjs/operators';

const LOG_PREFIX: string = "[Emission Types Data Service]";
const API_PREFIX: string = "api/v1/emission_types";
const HEADERS = { 'Content-Type': 'application/json' };


@Injectable({
  providedIn: 'root'
})
export class EmissionTypesDataService {

  // The base url of the server
  private _baseUrl: string = environment.baseUrl;

  // The local data cache
  private _cache: { emissionTypes: EmissionType[] } = { emissionTypes: [] };

  // The observables that allow subscribers to keep tabs of the current status 
  // of emission types records in the data store
  private _emissionTypesSubject$ = new BehaviorSubject<EmissionType[]>([]);
  readonly emissionTypes$ = this._emissionTypesSubject$.asObservable();

  // The observable that we will use to opt out of initialization subscriptions 
  // once we are done with them
  private _done$ = new Subject<boolean>();

  // The api that we'll use to communicate data store changes when components that 
  // subscribe to this service are outside the current ngzone
  private bc: BroadcastChannel = new BroadcastChannel("emission-types-data-channel");  

  constructor(
    private http: HttpClient,
    private connectivityStatusService: ConnectivityStatusService,
    private messageService: MessageService,
    private zone: NgZone,
    private log: NGXLogger,) {

    // Subscribe to connectivity status notifications
    this.log.trace(`${LOG_PREFIX} Subscribing to connectivity status notifications`);

    this.connectivityStatusService.online$
      .pipe(takeUntil(this._done$))
      .subscribe(online => {

        // Check if the user is online
        this.log.trace(`${LOG_PREFIX} Checking if the user is online`);
        this.log.debug(`${LOG_PREFIX} User is online = ${online}`);

        if (online) {

          // Initialize data
          this.log.trace(`${LOG_PREFIX} Initializing data`);

          this.getAllEmissionTypes()
            .pipe(first()) // This will automatically complete (and therefore unsubscribe) after the first value has been emitted.
            .subscribe((response => {

              // Data initialization complete
              this.log.trace(`${LOG_PREFIX} Data initialization complete`);

            }));

          // Unsubscribe from connectivity status notifications
          this.log.trace(`${LOG_PREFIX} Unsubscribing from connectivity status notifications`);
          this._done$.next();
          this._done$.complete();

        }

      });

    //Note: "bc.onmessage" isn't invoked on sender ui
    this.bc.onmessage = this.zone.run(() => this.handleEvent);      
  }


  /**
   * Publish information to current (listening) ui
   * @param event 
   */
   private handleEvent = (event: MessageEvent) => {
    this.zone.run(() => this._emissionTypesSubject$.next(event.data.newValue));
  }  


  /**
   * Creates and adds an instance of a new Emission Type record to the local cache and then broadcasts the changes to all subscribers
   * 
   * @param emissionType The details of the Emission Type record to be created - with the id and version details missing
   */
  public createEmissionType(emissionType: EmissionType): Observable<EmissionType> {

    this.log.trace(`${LOG_PREFIX} Entering createEmissionType()`);
    this.log.debug(`${LOG_PREFIX} EmissionType = ${JSON.stringify(emissionType)}`);

    // Make a HTTP POST Request to create the record
    this.log.debug(`${LOG_PREFIX} Making a HTTP POST Request to ${this._baseUrl}/${API_PREFIX} to create the record`);

    return this.http.post<EmissionType>(`${this._baseUrl}/${API_PREFIX}`, JSON.stringify(emissionType), { headers: new HttpHeaders(HEADERS) })
      .pipe(

        tap((data: EmissionType) => {

          // Emission Type record Creation was successful
          this.log.trace(`${LOG_PREFIX} Record Creation was successful`);
          this.log.debug(`${LOG_PREFIX} Created Emission Type record = ${JSON.stringify(data)}`);

          // Add the newly created Emission Type record to the Local Cache
          this.log.trace(`${LOG_PREFIX} Adding the newly created Emission Type record to the Local Cache`);
          this._cache.emissionTypes.push(data);

          // Create an up to date copy of the Emission Types records
          this.log.trace(`${LOG_PREFIX} Creating an up to date copy of the Emission Types records`);
          const copy = Object.assign({}, this._cache).emissionTypes;

          // Broadcast the up to date copy of the Emission Types records to the current listener
          this.log.trace(`${LOG_PREFIX} Broadcasting the up to date copy of the Emission Types records to the current listener`);
          this._emissionTypesSubject$.next(copy);

          // Broadcast the up to date copy of the Emission Types records to the other listeners
          this.log.trace(`${LOG_PREFIX} Broadcasting the up to date copy of the Emission Types records to the other listeners`);
          this.bc.postMessage({ newValue: copy });

          // Send a message that states that the Emission Type record Creation was successful
          this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Type record Creation was successful`);
          this.messageService.sendMessage({ "type": MessageType.Success, "message": "The Emission Type record Creation was successful" });

        }),

        catchError((error: any) => {

          // Emission Type record Creation was unsuccessful
          this.log.error(`${LOG_PREFIX} Emission Type record Creation was unsuccessful: ${error.statusText || "See Server Logs for more details"}`);

          // Send a message that states that the Emission Type record Creation was unsuccessful
          this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Type record Creation was unsuccessful`);
          this.messageService.sendMessage({ "type": MessageType.Error, "message": "The Emission Type record Creation was unsuccessful" });

          return throwError(error);
        }));
  }


  /**
   * Retrieves and adds a single Emission Type record to the local cache and then broadcasts the changes to all subscribers
   * 
   * @param emissionTypeId The Unique Identifier of the Emission Type record
   */
  getEmissionType(emissionTypeId: number): Observable<EmissionType> {

    this.log.trace(`${LOG_PREFIX} Entering getEmissionType()`);
    this.log.debug(`${LOG_PREFIX} EmissionType Id = ${emissionTypeId}`);

    // Make a HTTP GET Request to retrieve the record
    this.log.debug(`${LOG_PREFIX} Making a HTTP GET Request to ${this._baseUrl}/${API_PREFIX}/ids/${emissionTypeId} to retrieve the record`);

    return this.http.get<EmissionType>(`${this._baseUrl}/${API_PREFIX}/ids/${emissionTypeId}`, { headers: new HttpHeaders(HEADERS) })
      .pipe(

        tap((data: EmissionType) => {

          // Emission Type record Retrieval was successful
          this.log.trace(`${LOG_PREFIX} Emission Type record Retrieval was successful`);
          this.log.debug(`${LOG_PREFIX} Retrieved Emission Type record = ${JSON.stringify(data)}`);

          // Search for the Emission Type record in the Local Cache and return its index
          this.log.trace(`${LOG_PREFIX} Searching for the Emission Type record in the Local Cache and returning its index`);
          let index = this._cache.emissionTypes.findIndex(d => d.id === data.id);
          this.log.debug(`${LOG_PREFIX} Emission Type record Index = ${index}`);

          // If the record was found (index != -1), update it, else, add it to the Local Storage
          if (index != -1) {

            // The Emission Type record was found in the Local Cache
            this.log.trace(`${LOG_PREFIX} The Emission Type record was found in the Local Cache`);

            // Update the local Emission Type record
            this.log.trace(`${LOG_PREFIX} Updating the local Emission Type record`);
            this._cache.emissionTypes[index] = data;

          } else {

            // The Emission Type record was not found in the Local Cache
            this.log.trace(`${LOG_PREFIX} The Emission Type record was not found in the Local Cache`);

            // Add the Emission Type record to the Local Cache
            this.log.trace(`${LOG_PREFIX} Adding the Emission Type record to the Local Cache`);
            this._cache.emissionTypes.push(data);
          }

          // Create an up to date copy of the Emission Types records
          this.log.trace(`${LOG_PREFIX} Creating an up to date copy of the Emission Types records`);
          const copy = Object.assign({}, this._cache).emissionTypes;

          // Broadcast the up to date copy of the Emission Types records to the current listener
          this.log.trace(`${LOG_PREFIX} Broadcasting the up to date copy of the Emission Types records to the current listener`);
          this._emissionTypesSubject$.next(copy);

          // Broadcast the up to date copy of the Emission Types records to the other listeners
          this.log.trace(`${LOG_PREFIX} Broadcasting the up to date copy of the Emission Types records to the other listeners`);
          this.bc.postMessage({ newValue: copy });

          // Send a message that states that the Emission Type record Retrieval was successful
          this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Type record Retrieval was successful`);
          this.messageService.sendMessage({ "type": MessageType.Success, "message": "The Emission Type record Retrieval was successful" });

        }),

        catchError((error: any) => {

          // Emission Type record Retrieval was unsuccessful
          this.log.error(`${LOG_PREFIX} Emission Type record Retrieval was unsuccessful: ${error.statusText || "See Server Logs for more details"}`);

          // Send a message that states that the Emission Type record Retrieval was unsuccessful
          this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Type record Retrieval was unsuccessful`);
          this.messageService.sendMessage({ "type": MessageType.Error, "message": "The Emission Type record Retrieval was unsuccessful" });

          return throwError(error);
        }));
  }


  /**
   * Retrieves and adds all or a subset of all Emission Types records to the local cache and then broadcasts the changes to all subscribers
   * 
   * @param filters Optional query parameters used in filtering the retrieved records
   */
  getAllEmissionTypes(filters?: any): Observable<EmissionType[]> {

    this.log.trace(`${LOG_PREFIX} Entering getAllEmissionTypes()`);
    this.log.debug(`${LOG_PREFIX} Filters = ${JSON.stringify(filters)}`);

    // Make a HTTP GET Request to retrieve the records
    this.log.debug(`${LOG_PREFIX} Making a HTTP GET Request to ${this._baseUrl}/${API_PREFIX}/all to retrieve the records`);

    return this.http.get<EmissionType[]>(`${this._baseUrl}/${API_PREFIX}/all`, { headers: new HttpHeaders(HEADERS), params: filters == null ? {} : filters })
      .pipe(

        tap((data: EmissionType[]) => {

          // Emission Types records Retrieval was successful
          this.log.trace(`${LOG_PREFIX} Emission Types records Retrieval was successful`);
          this.log.debug(`${LOG_PREFIX} Retrieved Emission Types records = ${JSON.stringify(data)}`);

          // Update the Emission Types records in the Local Cache to the newly pulled Emission Types records
          this.log.trace(`${LOG_PREFIX} Updating the Emission Types records in the Local Cache to the newly pulled Emission Types records`);
          this._cache.emissionTypes = data;

          // Create an up to date copy of the Emission Types records
          this.log.trace(`${LOG_PREFIX} Creating an up to date copy of the Emission Types records`);
          const copy = Object.assign({}, this._cache).emissionTypes;

          // Broadcast the up to date copy of the Emission Types records to the current listener
          this.log.trace(`${LOG_PREFIX} Broadcasting the up to date copy of the Emission Types records to the current listener`);
          this._emissionTypesSubject$.next(copy);

          // Broadcast the up to date copy of the Emission Types records to the other listeners
          this.log.trace(`${LOG_PREFIX} Broadcasting the up to date copy of the Emission Types records to the other listeners`);
          this.bc.postMessage({ newValue: copy });

          // Send a message that states that the Emission Types records Retrieval was successful
          this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Types records Retrieval was successful`);
          this.messageService.sendMessage({ "type": MessageType.Success, "message": "The Emission Types records Retrieval was successful" });

        }),

        catchError((error: any) => {

          // Emission Types records Retrieval was unsuccessful
          this.log.error(`${LOG_PREFIX} Emission Types records Retrieval was unsuccessful: ${error.statusText || "See Server Logs for more details"}`);

          // Send a message that states that the Emission Types records Retrieval was unsuccessful
          this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Types records Retrieval was unsuccessful`);
          this.messageService.sendMessage({ "type": MessageType.Error, "message": "The Emission Types records Retrieval was unsuccessful" });

          return throwError(error);
        }));
  }


  /**
   * Updates a single Emission Type record and its corresponding counterpart in the local cache and then broadcasts the changes to all subscribers
   * 
   * @param emissionType The details of the Emission Type record to be updated
   */
  updateEmissionType(emissionType: EmissionType): Observable<EmissionType> {

    this.log.trace(`${LOG_PREFIX} Entering updateEmissionType()`);
    this.log.debug(`${LOG_PREFIX} EmissionType = ${JSON.stringify(emissionType)}`);

    // Make a HTTP POST Request to retrieve the records
    this.log.debug(`${LOG_PREFIX} Making a HTTP POST Request to ${this._baseUrl}/${API_PREFIX} to update the record`);

    return this.http.put<EmissionType>(`${this._baseUrl}/${API_PREFIX}`, JSON.stringify(emissionType), { headers: new HttpHeaders(HEADERS) })
      .pipe(

        tap((data: EmissionType) => {

          // Emission Type record Update was successful
          this.log.trace(`${LOG_PREFIX} Emission Type record Update was successful`);
          this.log.debug(`${LOG_PREFIX} Updated Emission Type record = ${JSON.stringify(data)}`);

          // Search for the locally stored Emission Type record
          this.log.trace(`${LOG_PREFIX} Searching for the locally stored Emission Type record`);
          let index = this._cache.emissionTypes.findIndex(d => d.id === data.id);
          this.log.debug(`${LOG_PREFIX} Updated Emission Type record Index = ${index}`);

          // If the record was found (index != -1), update it in the Local Cache
          if (index != -1) {

            // Update the local Emission Type record
            this.log.trace(`${LOG_PREFIX} Updating the locally stored Emission Type record`);
            this._cache.emissionTypes[index] = data;

          // Create an up to date copy of the Emission Types records
          this.log.trace(`${LOG_PREFIX} Creating an up to date copy of the Emission Types records`);
          const copy = Object.assign({}, this._cache).emissionTypes;

          // Broadcast the up to date copy of the Emission Types records to the current listener
          this.log.trace(`${LOG_PREFIX} Broadcasting the up to date copy of the Emission Types records to the current listener`);
          this._emissionTypesSubject$.next(copy);

          // Broadcast the up to date copy of the Emission Types records to the other listeners
          this.log.trace(`${LOG_PREFIX} Broadcasting the up to date copy of the Emission Types records to the other listeners`);
          this.bc.postMessage({ newValue: copy });

            // Send a message that states that the Emission Type record Update was successful
            this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Type record Update was successful`);
            this.messageService.sendMessage({ "type": MessageType.Success, "message": "The Emission Type record Update was successful" });

          } else {

            // Local Cache Update was unsuccessful
            this.log.error(`${LOG_PREFIX} Local Cache Update was unsuccessful: Emission Type record is missing in the Local Cache`);

            // Send a message that states that the Local Cache Update was unsuccessful
            this.log.trace(`${LOG_PREFIX} Sending a message that states that the Local Cache Update was unsuccessful`);
            this.messageService.sendMessage({ "type": MessageType.Error, "message": "Emission Types records Local Cache Update was unsuccessful" });
          }

        }),

        catchError((error: any) => {

          // Emission Type record Update was unsuccessful
          this.log.error(`${LOG_PREFIX} Emission Type record Update was unsuccessful: ${error.statusText || "See Server Logs for more details"}`);

          // Send a message that states that the Emission Type record Update was unsuccessful
          this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Type record Update was unsuccessful`);
          this.messageService.sendMessage({ "type": MessageType.Error, "message": "The Emission Type record Update was unsuccessful" });

          return throwError(error);

        }));
  }


  /**
   * Deletes a single Emission Type record and its corresponding counterpart in the local cache and then broadcasts the changes to all subscribers
   *
   * @param emissionTypeId The Unique Identifier of the record
   * @returns The total count of deleted records - which should be 1 in this case if the delete operation was successful
   */
  deleteEmissionType(emissionTypeId: number): Observable<number> {

    this.log.trace(`${LOG_PREFIX} Entering deleteEmissionType()`);
    this.log.debug(`${LOG_PREFIX} EmissionType Id = ${emissionTypeId}`);

    // Make a HTTP DELETE Request to retrieve the records
    this.log.debug(`${LOG_PREFIX} Making a HTTP DELETE Request to ${this._baseUrl}/${API_PREFIX}/ids/${emissionTypeId} to delete the record`);

    return this.http.delete<number>(`${this._baseUrl}/${API_PREFIX}/ids/${emissionTypeId}`, { headers: new HttpHeaders(HEADERS) })
      .pipe(

        tap((count: number) => {

          // Mark the deletion successful if and only if exactly 1 record was deleted
          if (count == 1) {

            // Emission Type record Deletion was successful
            this.log.trace(`${LOG_PREFIX} Emission Type record Deletion was successful`);

            // Search for the deleted Emission Type record in the Local Cache
            this.log.trace(`${LOG_PREFIX} Searching for the deleted Emission Type record in the Local Cache`);
            let index = this._cache.emissionTypes.findIndex(d => d.id == emissionTypeId);
            this.log.debug(`${LOG_PREFIX} Deleted Emission Type record Index = ${index}`);

            // If the record was found (index != -1), remove it from the Local Cache
            if (index != -1) {

              // Remove the deleted Emission Type record from the Local Cache
              this.log.trace(`${LOG_PREFIX} Removing the deleted Emission Type record from the Local Cache`);
              this._cache.emissionTypes.splice(index, 1);

          // Create an up to date copy of the Emission Types records
          this.log.trace(`${LOG_PREFIX} Creating an up to date copy of the Emission Types records`);
          const copy = Object.assign({}, this._cache).emissionTypes;

          // Broadcast the up to date copy of the Emission Types records to the current listener
          this.log.trace(`${LOG_PREFIX} Broadcasting the up to date copy of the Emission Types records to the current listener`);
          this._emissionTypesSubject$.next(copy);

          // Broadcast the up to date copy of the Emission Types records to the other listeners
          this.log.trace(`${LOG_PREFIX} Broadcasting the up to date copy of the Emission Types records to the other listeners`);
          this.bc.postMessage({ newValue: copy });

              // Send a message that states that the Emission Type record Deletion was successful
              this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Type record Deletion was successful`);
              this.messageService.sendMessage({ "type": MessageType.Success, "message": "The Emission Type record Deletion was successful" });

            } else {

              // Local Cache Update was unsuccessful
              this.log.error(`${LOG_PREFIX} Local Cache Update was unsuccessful: Emission Type record is missing in the Local Cache`);

              // Send a message that states that the Local Cache Update was unsuccessful
              this.log.trace(`${LOG_PREFIX} Sending a message that states that the Local Cache Update was unsuccessful`);
              this.messageService.sendMessage({ "type": MessageType.Error, "message": "Emission Types records Local Cache Update was unsuccessful" });
            }
          } else {

            // Emission Type record Deletion was unsuccessful
            this.log.error(`${LOG_PREFIX} Emission Type record Deletion was unsuccessful: Expecting 1 record to be deleted instead of ${count}`);

            // Send a message that states that the Emission Type record Deletion was unsuccessful
            this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Type record Deletion was unsuccessful`);
            this.messageService.sendMessage({ "type": MessageType.Error, "message": "The Emission Type record Deletion was unsuccessful" });

          }


        }),

        catchError((error: any) => {

          // Emission Type record Deletion was unsuccessful
          this.log.error(`${LOG_PREFIX} Emission Type record Deletion was unsuccessful: ${error.statusText || "See Server Logs for more details"}`);

          // Send a message that states that the Emission Type record Deletion was unsuccessful
          this.log.trace(`${LOG_PREFIX} Sending a message that states that the Emission Type record Deletion was unsuccessful`);
          this.messageService.sendMessage({ "type": MessageType.Error, "message": "The Emission Type record Deletion was unsuccessful" });

          return throwError(error);
        }));
  }


  /**
   * Use BehaviorSubject's getter property named value to get the most recent value passed through it.
   */
  public get records() {
    return this._emissionTypesSubject$.value;
  }
}