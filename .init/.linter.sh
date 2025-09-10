#!/bin/bash
cd /home/kavia/workspace/code-generation/question-answering-assistant-33453-33462/qa_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

