/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useRef } from 'react';
import SplitPane from 'react-split-pane';
import { useEditorStore } from 'Stores/EditorStore';
import { GraphFetchTreeData, getGraphFetchTreeData } from 'Utilities/GraphFetchTreeUtil';
import { PanelLoadingIndicator } from 'Components/shared/PanelLoadingIndicator';
import { FaEdit, FaPlay, FaScroll, FaSave } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import { CustomSelectorInput, SelectComponent } from 'Components/shared/CustomSelectorInput';
import { createFilter } from 'react-select';
import { MappingEditorState } from 'Stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { MdVerticalAlignBottom, MdAdd } from 'react-icons/md';
import { useDrop } from 'react-dnd';
import { DND_TYPE, MappingElementDragSource, MappingExecutionTargetDropTarget } from 'Utilities/DnDUtil';
import clsx from 'clsx';
import Dialog from '@material-ui/core/Dialog';
import { TAB_SIZE, EDITOR_LANGUAGE } from 'Stores/EditorConfig';
import { isNonNullable, guaranteeType, assertType, uniq, compareLabelFn, UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { GraphFetchTreeExplorer } from './GraphFetchTreeExplorer';
import { MappingExecutionGraphFetchQueryState, MappingExecutionEmptyRuntimeState, MappingExecutionJsonModelConnectionRuntimeState } from 'Stores/editor-state/element-editor-state/mapping/MappingExecutionState';
import { TextInputEditor } from 'Components/shared/TextInputEditor';
import { useApplicationStore } from 'Stores/ApplicationStore';
import { PackageableElementSelectOption } from 'MM/model/packageableElements/PackageableElement';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { getMappingElementTarget, getMappingElementSource, getMappingElementSourceFilterText, MappingElementSource, MappingElementSourceSelectOption } from 'MM/model/packageableElements/mapping/Mapping';
import { Type } from 'MM/model/packageableElements/domain/Type';

export const getMappingElementSourceSelectOption = (source: MappingElementSource): { label: string, value: MappingElementSource } => {
  if (source instanceof Class || source instanceof Type) {
    return { label: source.name, value: source };
  }
  throw new UnsupportedOperationError(`Can't compute select option for unsupported mapping element source type '${(source as MappingElementSource).constructor.name}'`);
};

export const MappingExecutionGraphFetchQueryBuilder = observer((props: {
  mappingEditorState: MappingEditorState;
  queryState: MappingExecutionGraphFetchQueryState;
}) => {
  const { mappingEditorState, queryState } = props;
  const executionState = mappingEditorState.executionState;
  const { target: targetElement, graphFetchTree } = queryState;
  const filterOption = createFilter({ ignoreCase: true, ignoreAccents: false, stringify: (option: PackageableElementSelectOption<Class>): string => option.value.path });
  const targetOptions = mappingEditorState.mapping.getAllMappingElements()
    .map(mappingElement => getMappingElementTarget(mappingElement))
    .filter((target): target is Class => target instanceof Class)
    .map(target => target.selectOption)
    .sort(compareLabelFn);
  // Target
  const targetSelectorRef = useRef<SelectComponent>(null);
  const [openTargetSelectorModal, setOpenTargetSelectorModal] = useState(false);
  const showTargetSelectorModal = (): void => setOpenTargetSelectorModal(true);
  const hideTargetSelectorModal = (): void => setOpenTargetSelectorModal(false);
  const handleEnterTargetSelectorModal = (): void => targetSelectorRef.current?.focus();
  const changeTarget = (target: Class | undefined): void => {
    queryState.setTarget(target);
    executionState.setExecutionResult(undefined);
    if (target) {
      queryState.setGraphFetchTree(getGraphFetchTreeData(target));
      // update source if possible based on the selected target, if there is only one available source, use it
      const possibleSources = mappingEditorState.mapping.getAllMappingElements()
        .filter(mappingElement => getMappingElementTarget(mappingElement) === target)
        .map(mappingElement => getMappingElementSource(mappingElement))
        .filter(isNonNullable);
      executionState.setRuntimeStateBasedOnSource(possibleSources.length ? possibleSources[0] : undefined, true);
    } else {
      queryState.setGraphFetchTree(undefined);
    }
    hideTargetSelectorModal();
  };
  const changeTargetOption = (val: PackageableElementSelectOption<Class>): void => changeTarget(val.value);

  // Drag and Drop
  const handleDrop = (item: MappingExecutionTargetDropTarget): void => changeTarget(guaranteeType(getMappingElementTarget(item.data), Class));
  const [{ isDragOver }, dropRef] = useDrop({
    accept: DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
    drop: (item: MappingElementDragSource): void => handleDrop(item),
    collect: monitor => ({ isDragOver: monitor.isOver({ shallow: true }) }),
  });

  const updateTreeData = (data: GraphFetchTreeData): void => queryState.setGraphFetchTree(data);
  // Deep/Graph Fetch Tree
  return (
    <div className="panel mapping-execution-panel__target-panel">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__label">target</div>
          <div className="panel__header__title__content">{targetElement?.name ?? '(none)'}</div>
        </div>
        <div className="panel__header__actions">
          <button
            className="panel__header__action"
            tabIndex={-1}
            onClick={showTargetSelectorModal}
            title={'Choose a target'}
          ><FaEdit /></button>
        </div>
      </div>
      <div ref={dropRef} className={clsx('panel__content', { 'panel__content--dnd-over': isDragOver })}>
        {graphFetchTree &&
          <div className="mapping-execution-panel__target-panel__query-container">
            <GraphFetchTreeExplorer treeData={graphFetchTree} updateTreeData={updateTreeData} parentMapping={mappingEditorState.mapping} isReadOnly={false} />
          </div>
        }
        {!graphFetchTree &&
          <div className="mapping-execution-panel__target" onClick={showTargetSelectorModal}>
            <div className="mapping-execution-panel__target__text">Choose a target</div>
            <div className="mapping-execution-panel__target__action"><MdVerticalAlignBottom /></div>
          </div>
        }
      </div>
      <Dialog
        open={openTargetSelectorModal}
        onClose={hideTargetSelectorModal}
        onEnter={handleEnterTargetSelectorModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <div className="modal search-modal">
          <div className="modal__title">Choose a target</div>
          <CustomSelectorInput
            ref={targetSelectorRef}
            options={targetOptions}
            onChange={changeTargetOption}
            value={targetElement ? targetElement.selectOption : null}
            placeholder={'Choose a class that has been mapped'}
            filterOption={filterOption}
            isClearable={true}
          />
        </div>
      </Dialog>
    </div>
  );
});

export const MappingExecutionQueryBuilder = observer((props: {
  mappingEditorState: MappingEditorState;
}) => {
  const { mappingEditorState } = props;
  const queryState = mappingEditorState.executionState.queryState;
  // TODO: we might need to let user choose the type of query they want to build, but by default, it can be graph fetch tree
  if (queryState instanceof MappingExecutionGraphFetchQueryState) {
    return <MappingExecutionGraphFetchQueryBuilder mappingEditorState={mappingEditorState} queryState={queryState} />;
  }
  return null;
});

export const MappingExecutionEmptyRuntimeBuilder = observer((props: {
  mappingEditorState: MappingEditorState;
  target?: Class;
}) => {
  const { mappingEditorState, target } = props;
  const executionState = mappingEditorState.executionState;
  // Source
  const filterOption = createFilter({ ignoreCase: true, ignoreAccents: false, stringify: getMappingElementSourceFilterText });
  const sourceOptions = target
    ? uniq(mappingEditorState.mapping.getAllMappingElements()
      .filter(mappingElement => getMappingElementTarget(mappingElement) === target)
      .map(mappingElement => getMappingElementSource(mappingElement))
      .filter(isNonNullable))
      .map(source => getMappingElementSourceSelectOption(source))
      .sort(compareLabelFn)
    : [];
  const sourceSelectorRef = useRef<SelectComponent>(null);
  const [openSourceSelectorModal, setOpenSourceSelectorModal] = useState(false);
  const showSourceSelectorModal = (): void => setOpenSourceSelectorModal(true);
  const hideSourceSelectorModal = (): void => setOpenSourceSelectorModal(false);
  const handleEnterSourceSelectorModal = (): void => sourceSelectorRef.current?.focus();
  const changeSource = (source: MappingElementSource | undefined): void => {
    executionState.setRuntimeStateBasedOnSource(source, true);
    executionState.setExecutionResult(undefined);
    hideSourceSelectorModal();
  };
  const changeSourceOption = (val: MappingElementSourceSelectOption): void => changeSource(val.value);

  return (
    <div className="panel mapping-execution-panel__source-panel">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__label">source</div>
          <div className="panel__header__title__content">(none)</div>
        </div>
        <div className="panel__header__actions">
          <button
            className="panel__header__action"
            disabled={!target}
            tabIndex={-1}
            onClick={showSourceSelectorModal}
            title={'Choose a source'}
          ><FaEdit /></button>
        </div>
      </div>
      <div className="panel__content mapping-execution-panel__json-editor">
        {target &&
          <div className="mapping-execution-panel__source" onClick={showSourceSelectorModal}>
            <div className="mapping-execution-panel__source__text">Choose a source</div>
            <div className="mapping-execution-panel__source__action"><MdAdd /></div>
          </div>
        }
        {!target && <div className="panel__content mapping-execution-panel--empty">No source options available as target is not specified</div>}
      </div>
      <Dialog
        open={openSourceSelectorModal}
        onClose={hideSourceSelectorModal}
        onEnter={handleEnterSourceSelectorModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <div className="modal search-modal">
          <div className="modal__title">Choose a source</div>
          <CustomSelectorInput
            ref={sourceSelectorRef}
            options={sourceOptions}
            onChange={changeSourceOption}
            value={null}
            placeholder={'Choose a source'}
            filterOption={filterOption}
            isClearable={true}
          />
        </div>
      </Dialog>
    </div>
  );
});

export const MappingExecutionJsonModelConnectionRuntimeBuilder = observer((props: {
  mappingEditorState: MappingEditorState;
  queryState: MappingExecutionGraphFetchQueryState;
  runtimeState: MappingExecutionJsonModelConnectionRuntimeState;
}) => {
  const { mappingEditorState, runtimeState, queryState } = props;
  const executionState = mappingEditorState.executionState;
  const { testData, sourceClass } = runtimeState;
  // Source
  const filterOption = createFilter({ ignoreCase: true, ignoreAccents: false, stringify: getMappingElementSourceFilterText });
  const sourceOptions = queryState.target
    ? mappingEditorState.mapping.getAllMappingElements()
      .filter(mappingElement => getMappingElementTarget(mappingElement) === queryState.target)
      .map(mappingElement => getMappingElementSource(mappingElement))
      .filter(isNonNullable)
      .map(source => getMappingElementSourceSelectOption(source))
      .sort(compareLabelFn)
    : [];
  const sourceSelectorRef = useRef<SelectComponent>(null);
  const [openSourceSelectorModal, setOpenSourceSelectorModal] = useState(false);
  const showSourceSelectorModal = (): void => setOpenSourceSelectorModal(true);
  const hideSourceSelectorModal = (): void => setOpenSourceSelectorModal(false);
  const handleEnterSourceSelectorModal = (): void => sourceSelectorRef.current?.focus();
  const changeSource = (source: MappingElementSource | undefined): void => {
    executionState.setRuntimeStateBasedOnSource(source, true);
    executionState.setExecutionResult(undefined);
    hideSourceSelectorModal();
  };
  const changeSourceOption = (val: MappingElementSourceSelectOption): void => changeSource(val.value);
  // Input Data
  const updateInput = (val: string): void => runtimeState.setTestData(val);

  return (
    <div className="panel mapping-execution-panel__source-panel">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__label">source</div>
          <div className="panel__header__title__content">{sourceClass?.name ?? '(none)'}</div>
        </div>
        <div className="panel__header__actions">
          <button
            className="panel__header__action"
            tabIndex={-1}
            onClick={showSourceSelectorModal}
            title={'Choose a source'}
          ><FaEdit /></button>
        </div>
      </div>
      <div className="panel__content mapping-execution-panel__json-editor">
        <TextInputEditor inputValue={testData} updateInput={updateInput} language={EDITOR_LANGUAGE.JSON} />
      </div>
      <Dialog
        open={openSourceSelectorModal}
        onClose={hideSourceSelectorModal}
        onEnter={handleEnterSourceSelectorModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <div className="modal search-modal">
          <div className="modal__title">Choose a source</div>
          <CustomSelectorInput
            ref={sourceSelectorRef}
            options={sourceOptions}
            onChange={changeSourceOption}
            value={sourceClass?.selectOption ?? null}
            placeholder={'Choose a class'}
            filterOption={filterOption}
            isClearable={true}
          />
        </div>
      </Dialog>
    </div>
  );
});

export const MappingExecutionRuntimeBuilder = observer((props: {
  mappingEditorState: MappingEditorState;
}) => {
  const { mappingEditorState } = props;
  const queryState = mappingEditorState.executionState.queryState;
  const runtimeState = mappingEditorState.executionState.runtimeState;
  if (runtimeState instanceof MappingExecutionEmptyRuntimeState) {
    let currentTarget: Class | undefined = undefined;
    if (queryState instanceof MappingExecutionGraphFetchQueryState) {
      currentTarget = queryState.target;
    }
    return <MappingExecutionEmptyRuntimeBuilder mappingEditorState={mappingEditorState} target={currentTarget} />;
  } else if (runtimeState instanceof MappingExecutionJsonModelConnectionRuntimeState) {
    assertType(queryState, MappingExecutionGraphFetchQueryState, 'Model-to-model mapping execution only support graph fetch tree query type');
    return <MappingExecutionJsonModelConnectionRuntimeBuilder mappingEditorState={mappingEditorState} queryState={queryState} runtimeState={runtimeState} />;
  }
  return null;
});

export const MappingExecutionBuilder = observer((props: {
  mappingEditorState: MappingEditorState;
}) => {
  const { mappingEditorState } = props;
  const applicationStore = useApplicationStore();
  const executionState = mappingEditorState.executionState;
  const { queryState, runtimeState, executionPlan } = executionState;
  // plan
  const closePlanViewer = (): void => executionState.setExecutionPlan(undefined);
  const generatePlan = applicationStore.guaranteeSafeAction(() => executionState.generatePlan());
  const planText = executionState.executionPlan ? JSON.stringify(executionState.executionPlan, null, TAB_SIZE) : '';
  // execution
  const execute = applicationStore.guaranteeSafeAction(() => executionState.executeMapping());
  const executionResultString = executionState.executionResult ? JSON.stringify(executionState.executionResult, null, TAB_SIZE) : '';
  // actions
  const promote = applicationStore.guaranteeSafeAction(() => executionState.promoteToTest());
  return (
    <div className="mapping-execution-panel">
      <PanelLoadingIndicator isLoading={executionState.isExecuting || executionState.isGeneratingPlan} />
      <SplitPane split="vertical" defaultSize={500} minSize={500} maxSize={-250}>
        <SplitPane split="vertical" defaultSize={250} minSize={250} maxSize={-250}>
          {/* use UUID key to make sure these components refresh when we change the state */}
          <MappingExecutionQueryBuilder key={executionState.queryState.uuid} mappingEditorState={mappingEditorState} />
          <MappingExecutionRuntimeBuilder key={executionState.runtimeState.uuid} mappingEditorState={mappingEditorState} />
        </SplitPane>
        <div className="panel mapping-execution-panel__result-panel">
          <div className="panel__header">
            <div className="panel__header__title">
              <div className="panel__header__title__label">result</div>
            </div>
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                disabled={!queryState.isValid || !runtimeState.isValid || executionState.isExecuting}
                onClick={execute}
                tabIndex={-1}
                title={'Execute'}
              ><FaPlay /></button>
              <button
                className="panel__header__action mapping-execution-panel__generate-plan-btn"
                disabled={!queryState.isValid || !runtimeState.isValid || executionState.isGeneratingPlan}
                onClick={generatePlan}
                tabIndex={-1}
                title={'See exection plan'}
              ><FaScroll /></button>
              {!mappingEditorState.isReadOnly &&
                <button
                  className="panel__header__action"
                  disabled={!queryState.isValid || !runtimeState.isValid || executionState.isExecuting || !executionState.executionResult}
                  onClick={promote}
                  tabIndex={-1}
                  title={'Promote to test'}
                ><FaSave /></button>
              }
            </div>
          </div>
          <div className="panel__content mapping-execution-panel__json-editor">
            <TextInputEditor inputValue={executionResultString} isReadOnly={true} language={EDITOR_LANGUAGE.JSON} />
          </div>
        </div>
      </SplitPane>
      <Dialog
        open={Boolean(executionPlan)}
        onClose={closePlanViewer}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <div className="modal modal--dark editor-modal execution-plan-viewer">
          <div className="modal__header">
            <div className="modal__title">Execution Plan</div>
          </div>
          <div className="modal__body">
            <TextInputEditor inputValue={planText} isReadOnly={true} language={EDITOR_LANGUAGE.JSON} showMiniMap={true} />
          </div>
          <div className="modal__footer">
            <button className="btn execution-plan-viewer__close-btn" onClick={closePlanViewer}>Close</button>
          </div>
        </div>
      </Dialog>
    </div>
  );
});

export const MappingExecution = observer(() => {
  const editorStore = useEditorStore();
  const currentElementState = editorStore.currentEditorState;
  if (!currentElementState || !(currentElementState instanceof MappingEditorState)) {
    return (
      // TODO: we should hide this from the UI when we're not in Mapping state since execution only makes sense in the context of mapping
      <div className="mapping-execution-panel mapping-execution-panel--no-content">Execution supported only mappings as of now. Open a mapping to enable panel.</div>
    );
  }
  return <MappingExecutionBuilder mappingEditorState={currentElementState} />;
});
