// SPDX-License-Identifier: Apache-2.0
// Licensed to the Ed-Fi Alliance under one or more agreements.
// The Ed-Fi Alliance licenses this file to you under the Apache License, Version 2.0.
// See the LICENSE and NOTICES files in the project root for more information.

export type UpsertResult = {
  result: 'INSERT_SUCCESS' | 'INSERT_FAILURE_REFERENCE' | 'UPDATE_SUCCESS' | 'UPDATE_FAILURE_REFERENCE' | 'UNKNOWN_FAILURE';
  failureMessage?: string;
};