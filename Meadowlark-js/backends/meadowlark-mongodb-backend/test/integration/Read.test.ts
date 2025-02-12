// SPDX-License-Identifier: Apache-2.0
// Licensed to the Ed-Fi Alliance under one or more agreements.
// The Ed-Fi Alliance licenses this file to you under the Apache License, Version 2.0.
// See the LICENSE and NOTICES files in the project root for more information.

import {
  DocumentInfo,
  NoDocumentInfo,
  newDocumentInfo,
  newSecurity,
  meadowlarkIdForDocumentIdentity,
  GetRequest,
  UpsertRequest,
  NoResourceInfo,
  ResourceInfo,
  newResourceInfo,
  TraceId,
  MeadowlarkId,
  DocumentUuid,
  UpdateRequest,
} from '@edfi/meadowlark-core';
import { Collection, MongoClient } from 'mongodb';
import { MeadowlarkDocument } from '../../src/model/MeadowlarkDocument';
import { getDocumentCollection, getNewClient } from '../../src/repository/Db';
import { getDocumentByDocumentUuid } from '../../src/repository/Get';
import { upsertDocument } from '../../src/repository/Upsert';
import { setupConfigForIntegration } from './Config';
import { updateDocumentByDocumentUuid } from '../../src/repository/Update';

const newGetRequest = (): GetRequest => ({
  documentUuid: '' as DocumentUuid,
  resourceInfo: NoResourceInfo,
  security: { ...newSecurity() },
  traceId: 'traceId' as TraceId,
});

const newUpsertRequest = (): UpsertRequest => ({
  meadowlarkId: '' as MeadowlarkId,
  resourceInfo: NoResourceInfo,
  documentInfo: NoDocumentInfo,
  edfiDoc: {},
  validateDocumentReferencesExist: false,
  security: { ...newSecurity() },
  traceId: 'traceId' as TraceId,
});

const newUpdateRequest = (): UpdateRequest => ({
  meadowlarkId: '' as MeadowlarkId,
  documentUuid: '' as DocumentUuid,
  resourceInfo: NoResourceInfo,
  documentInfo: NoDocumentInfo,
  edfiDoc: {},
  validateDocumentReferencesExist: false,
  security: { ...newSecurity() },
  traceId: 'traceId' as TraceId,
});

describe('given the get of a non-existent document', () => {
  let client;
  let getResult;

  const resourceInfo: ResourceInfo = {
    ...newResourceInfo(),
    resourceName: 'School',
  };
  const documentInfo: DocumentInfo = {
    ...newDocumentInfo(),
    documentIdentity: { natural: 'get1' },
  };
  const meadowlarkId = meadowlarkIdForDocumentIdentity(resourceInfo, documentInfo.documentIdentity);

  beforeAll(async () => {
    await setupConfigForIntegration();

    client = (await getNewClient()) as MongoClient;

    getResult = await getDocumentByDocumentUuid({ ...newGetRequest(), documentUuid: '123' as DocumentUuid }, client);
  });

  afterAll(async () => {
    await getDocumentCollection(client).deleteMany({});
    await client.close();
  });

  it('should not exist in the db', async () => {
    const collection: Collection<MeadowlarkDocument> = getDocumentCollection(client);
    const result: any = await collection.findOne({ _id: meadowlarkId });
    expect(result).toBe(null);
  });

  it('should return get failure', async () => {
    expect(getResult.response).toBe('GET_FAILURE_NOT_EXISTS');
  });
});

describe('given the get of an existing document', () => {
  let client;
  let getResult;

  const resourceInfo: ResourceInfo = {
    ...newResourceInfo(),
    resourceName: 'School',
  };
  const documentInfo: DocumentInfo = {
    ...newDocumentInfo(),
    documentIdentity: { natural: 'get2' },
  };
  const meadowlarkId = meadowlarkIdForDocumentIdentity(resourceInfo, documentInfo.documentIdentity);

  beforeAll(async () => {
    await setupConfigForIntegration();

    client = (await getNewClient()) as MongoClient;
    const upsertRequest: UpsertRequest = {
      ...newUpsertRequest(),
      meadowlarkId,
      documentInfo,
      edfiDoc: { inserted: 'yes' },
    };
    Date.now = jest.fn(() => 1683326572053);
    // insert the initial version
    const upsertResult = await upsertDocument(upsertRequest, client);
    if (upsertResult.response !== 'INSERT_SUCCESS') throw new Error();

    getResult = await getDocumentByDocumentUuid(
      { ...newGetRequest(), documentUuid: upsertResult.newDocumentUuid, resourceInfo },
      client,
    );
  });

  afterAll(async () => {
    await getDocumentCollection(client).deleteMany({});
    await client.close();
  });

  it('should return the document', async () => {
    expect(getResult.response).toBe('GET_SUCCESS');
    expect(getResult.document.inserted).toBe('yes');
  });

  it('should return the _lastmodifiedDate', async () => {
    expect(getResult.response).toBe('GET_SUCCESS');
    expect(getResult.document).toEqual(
      expect.objectContaining({
        _lastModifiedDate: '2023-05-05T22:42:52.053Z',
      }),
    );
  });
});

describe('given the get of an updated document', () => {
  let client;
  let getResult;

  const resourceInfo: ResourceInfo = {
    ...newResourceInfo(),
    resourceName: 'School',
  };
  const documentInfo: DocumentInfo = {
    ...newDocumentInfo(),
    documentIdentity: { natural: 'getUpdatedDocument' },
  };
  const meadowlarkId = meadowlarkIdForDocumentIdentity(resourceInfo, documentInfo.documentIdentity);

  beforeAll(async () => {
    await setupConfigForIntegration();

    client = (await getNewClient()) as MongoClient;
    const upsertRequest: UpsertRequest = {
      ...newUpsertRequest(),
      meadowlarkId,
      documentInfo,
      edfiDoc: { inserted: 'yes' },
    };
    Date.now = jest.fn(() => 1683326572053);
    // insert the initial version
    const upsertResult = await upsertDocument(upsertRequest, client);
    if (upsertResult.response !== 'INSERT_SUCCESS') throw new Error();
    Date.now = jest.fn(() => 1683548337342);
    const updateRequest: UpdateRequest = {
      ...newUpdateRequest(),
      documentUuid: upsertResult.newDocumentUuid,
      meadowlarkId,
      documentInfo,
      edfiDoc: { natural: 'keyUpdated' },
    };
    const updateResult = await updateDocumentByDocumentUuid(updateRequest, client);
    if (updateResult.response !== 'UPDATE_SUCCESS') throw new Error();
    getResult = await getDocumentByDocumentUuid(
      { ...newGetRequest(), documentUuid: upsertResult.newDocumentUuid, resourceInfo },
      client,
    );
  });

  afterAll(async () => {
    await getDocumentCollection(client).deleteMany({});
    await client.close();
  });

  it('should return the updated _lastmodifiedDate', async () => {
    expect(getResult.response).toBe('GET_SUCCESS');
    expect(getResult.document).toEqual(
      expect.objectContaining({
        _lastModifiedDate: '2023-05-08T12:18:57.342Z',
      }),
    );
  });
});
