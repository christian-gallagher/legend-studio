/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { DepotServerClient } from '@finos/legend-server-depot';
import {
  type ApplicationStore,
  LegendApplicationSDLCSetupState,
} from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import type { LegendQueryApplicationConfig } from '../application/LegendQueryApplicationConfig.js';
import type { LegendQueryApplicationPlugin } from './LegendQueryApplicationPlugin.js';
import type { SDLCServerClient } from '@finos/legend-server-sdlc';

export type LegendQueryApplicationStore = ApplicationStore<
  LegendQueryApplicationConfig,
  LegendQueryApplicationPlugin
>;

export class LegendQueryBaseStore {
  applicationStore: LegendQueryApplicationStore;
  depotServerClient: DepotServerClient;
  pluginManager: LegendQueryPluginManager;
  applicationSDLCSetupState: LegendApplicationSDLCSetupState;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    sdlcServerClient: SDLCServerClient,
    pluginManager: LegendQueryPluginManager,
  ) {
    this.applicationStore = applicationStore;
    this.applicationSDLCSetupState = new LegendApplicationSDLCSetupState(
      applicationStore,
      sdlcServerClient,
    );
    this.depotServerClient = depotServerClient;
    this.pluginManager = pluginManager;

    // Register plugins
    this.applicationSDLCSetupState.sdlcServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
  }
}
