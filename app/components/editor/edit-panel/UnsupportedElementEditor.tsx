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

import React from 'react';
import { observer } from 'mobx-react-lite';
import { FaLock } from 'react-icons/fa';
import { useEditorStore } from 'Stores/EditorStore';
import { UnsupportedElementEditorState } from 'Stores/editor-state/UnsupportedElementEditorState';
import { getPackageableElementType } from 'Utilities/GraphUtil';
import { getElementTypeLabel } from 'Components/editor/side-bar/CreateNewElementModal';
import { BlankPanelContent } from 'Components/shared/BlankPanelContent';
import { useApplicationStore } from 'Stores/ApplicationStore';

export const UnsupportedEditorPanel = observer((props: {
  text: string;
  isReadOnly: boolean;
}) => {
  const { text, isReadOnly } = props;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const handleTextModeClick = applicationStore.guaranteeSafeAction(() => editorStore.toggleTextMode());

  return (
    <BlankPanelContent>
      <div className="unsupported-element-editor__main">
        <div className="unsupported-element-editor__summary">{text}</div>
        {!isReadOnly &&
          <button
            className="btn--dark unsupported-element-editor__to-text-mode__btn"
            onClick={handleTextModeClick}
          >Edit in text mode</button>
        }
      </div>
    </BlankPanelContent>
  );
});

// NOTE: this editor can be used for any element supported via text mode but no editor has been built
export const UnsupportedElementEditor = observer(() => {
  const editorStore = useEditorStore();
  const unsupportedElementEditorState = editorStore.getCurrentEditorState(UnsupportedElementEditorState);
  const element = unsupportedElementEditorState.element;
  const isReadOnly = unsupportedElementEditorState.isReadOnly;

  return (
    <div className="unsupported-element-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && <div className="uml-element-editor__header__lock"><FaLock /></div>}
            <div className="panel__header__title__label">{getElementTypeLabel(getPackageableElementType(element))}</div>
            <div className="panel__header__title__content">{element.name}</div>
          </div>
        </div>
        <div className="panel__content unsupported-element-editor__content">
          <UnsupportedEditorPanel text={`Can't display this element in form-mode`} isReadOnly={isReadOnly} />
        </div>
      </div>
    </div>
  );
});
