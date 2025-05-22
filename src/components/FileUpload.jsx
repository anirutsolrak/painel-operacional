import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { insertCallRecords } from '../utils/supabaseClient';

function FileUpload({ onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info' });

  const handleFileChange = (event) => {
    setMessage({ text: '', type: 'info' });
    const file = event.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        setMessage({
          text: 'Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV.',
          type: 'error',
        });
        setSelectedFile(null);
        event.target.value = null;
        return;
      }
      setSelectedFile(file);
      setMessage({ text: `Arquivo selecionado: ${file.name}`, type: 'info' });
    } else {
      setSelectedFile(null);
    }
  };

  const formatExcelDateToISO = (excelDateInput) => {
    if (excelDateInput === null || excelDateInput === undefined || excelDateInput === "") {
      return null;
    }
    let date;
    if (excelDateInput instanceof Date) {
      date = excelDateInput;
    } else if (typeof excelDateInput === 'number') {
      const parsed = XLSX.SSF.parse_date_code(excelDateInput);
      if (!parsed) return null;
      date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0));
    } else if (typeof excelDateInput === 'string') {
      let parsedDate = new Date(excelDateInput);
      if (isNaN(parsedDate.getTime())) {
        const parts = excelDateInput.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?(?:\.\d+)?Z?$/);
        if (parts) {
          const day = parseInt(parts[1], 10);
          const month = parseInt(parts[2], 10);
          const year = parseInt(parts[3].length === 2 ? `20${parts[3]}` : parts[3], 10);
          const hour = parts[4] ? parseInt(parts[4], 10) : 0;
          const minute = parts[5] ? parseInt(parts[5], 10) : 0;
          const second = parts[6] ? parseInt(parts[6], 10) : 0;
          parsedDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        } else {
          const isoAttemptWithSpace = excelDateInput.replace(' ', 'T');
          parsedDate = new Date(isoAttemptWithSpace);
          if (isNaN(parsedDate.getTime())) return null;
        }
      }
      date = parsedDate;
    } else {
      return null;
    }

    if (isNaN(date.getTime())) return null;

    return date.toISOString();
  };

  const timeToSeconds = (timeInput) => {
    if (timeInput === null || timeInput === undefined || timeInput === '') return null;
    if (typeof timeInput === 'number' && timeInput >= 0 && timeInput < 1) {
      const secondsInDay = 24 * 60 * 60;
      return Math.round(timeInput * secondsInDay);
    }
    let timeStr = String(timeInput).trim();
    const durationMatch = timeStr.match(/^(\d+):(\d{2}):(\d{2})$/);
    if (durationMatch) {
      const [, hoursStr, minutesStr, secondsStr] = durationMatch;
      const h = parseInt(hoursStr, 10);
      const m = parseInt(minutesStr, 10);
      const s = parseInt(secondsStr, 10);
      if (isNaN(h) || isNaN(m) || isNaN(s) || h < 0 || m < 0 || m > 59 || s < 0 || s > 59) {
        return null;
      }
      const totalSeconds = h * 3600 + m * 60 + s;
      return totalSeconds;
    }
    const minuteDurationMatch = timeStr.match(/^(\d+):(\d{2})$/);
    if (minuteDurationMatch) {
      const [, hoursStr, minutesStr] = minuteDurationMatch;
      const h = parseInt(hoursStr, 10);
      const m = parseInt(minutesStr, 10);
      if (isNaN(h) || isNaN(m) || h < 0 || m < 0 || m > 59) {
        return null;
      }
      const totalSeconds = h * 3600 + m * 60;
      return totalSeconds;
    }
    return null;
  };

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setMessage({ text: 'Nenhum arquivo selecionado.', type: 'error' });
      return;
    }
    setIsLoading(true);
    setMessage({ text: 'Lendo e processando arquivo...', type: 'info' });
    const reader = new FileReader();
    reader.onload = async (e) => {
      let transformedData = [];
      let validationErrors = [];
      try {
        const data = e.target.result;
        const workbookRaw = XLSX.read(data, { type: 'binary', raw: true, cellDates: false });
        const sheetNameRaw = workbookRaw.SheetNames[0];
        const worksheetRaw = workbookRaw.Sheets[sheetNameRaw];
        const rowsRaw = XLSX.utils.sheet_to_json(worksheetRaw, {
          header: 1,
          raw: true,
          defval: null,
        });
        const workbook = XLSX.read(data, { type: 'binary', raw: false, cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
          defval: null,
        });
        if (rows.length < 2) throw new Error('Planilha vazia ou sem dados.');
        const headerRow = rows[0].map((h) => h ? String(h).trim() : null);
        const normalizeHeader = (header) => header ? String(header).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g, '') : null;
        const headerMap = {
          call_timestamp: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('Envio da Ligação')),
          duration_seconds: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('Tempo')),
          cpf_cnpj: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('CPF / CNPJ')),
          uf: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('UF')),
          user_group: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('Grupo Usuário')),
          operator_name: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('Operador')),
          tabulation: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('Tabulado Como')),
        };
        const requiredHeaders = ['Envio da Ligação', 'Tempo', 'UF', 'Grupo Usuário', 'Operador', 'Tabulado Como'];
        const missingHeaders = requiredHeaders.filter(h => headerRow.findIndex(hr => normalizeHeader(hr) === normalizeHeader(h)) === -1);
        if (missingHeaders.length > 0) {
          throw new Error(`Cabeçalho inválido. Colunas esperadas não encontradas: ${missingHeaders.join(', ')}`);
        }
        setMessage({
          text: `Processando ${rows.length - 1} linhas...`,
          type: 'info',
        });
        validationErrors = [];
        transformedData = rows
          .slice(1)
          .map((row, index) => {
            const rowNum = index + 2;
            const record = {};
            let rowHasError = false;
            const rowErrors = [];
            const rawRowFormatted = rows[index + 1];
            const rawRowRaw = rowsRaw[index + 1];
            const rawTimestamp = rawRowFormatted[headerMap.call_timestamp];
            const rawDurationFormatted = rawRowFormatted[headerMap.duration_seconds];
            const rawDurationRaw = rawRowRaw[headerMap.duration_seconds];
            const rawCpfCnpj = rawRowFormatted[headerMap.cpf_cnpj];
            const rawUf = rawRowFormatted[headerMap.uf];
            const rawUserGroup = rawRowFormatted[headerMap.user_group];
            const rawOperator = rawRowFormatted[headerMap.operator_name];
            const rawTabulation = rawRowFormatted[headerMap.tabulation];
            record.call_timestamp = formatExcelDateToISO(rawTimestamp);
            if (record.call_timestamp === null) {
              rowErrors.push(`Data/Hora inválida ("${rawTimestamp}")`);
              rowHasError = true;
            }
            let parsedDuration = null;
            if (typeof rawDurationRaw === 'number' && rawDurationRaw >= 0 && rawDurationRaw < 1) {
              const secondsInDay = 24 * 60 * 60;
              parsedDuration = Math.round(rawDurationRaw * secondsInDay);
            } else {
              parsedDuration = timeToSeconds(rawDurationFormatted);
            }
            record.duration_seconds = parsedDuration;
            if (record.duration_seconds === null) {
              rowErrors.push(`Duração inválida ("${rawDurationFormatted}" / raw: ${rawDurationRaw})`);
              rowHasError = true;
            } else if (record.duration_seconds < 0) {
              rowErrors.push(`Duração negativa ("${rawDurationFormatted}" / raw: ${rawDurationRaw})`);
              rowHasError = true;
            }
            record.cpf_cnpj = rawCpfCnpj ? String(rawCpfCnpj).trim() : null;
            record.uf = rawUf ? String(rawUf).trim().toUpperCase() : null;
            record.user_group = rawUserGroup ? String(rawUserGroup).trim() : null;
            record.operator_name = rawOperator ? String(rawOperator).trim() : null;
            record.tabulation = rawTabulation ? String(rawTabulation).trim() : null;
            if (!record.uf) {
              rowErrors.push(`UF ausente.`);
              rowHasError = true;
            }
            if (!record.user_group) {
              rowErrors.push(`Grupo Usuário ausente.`);
              rowHasError = true;
            }
            if (!record.operator_name) {
              rowErrors.push(`Operador ausente.`);
              rowHasError = true;
            }
            if (!record.tabulation) {
              rowErrors.push(`Tabulação ausente.`);
              rowHasError = true;
            }
            if (rowHasError) {
              validationErrors.push(`Linha ${rowNum}: ${rowErrors.join(', ')}`);
              return null;
            } else {
              return record;
            }
          })
          .filter((record) => record !== null);
        if (transformedData.length === 0 && validationErrors.length === 0) {
          throw new Error('Nenhum dado válido encontrado no arquivo.');
        }
        const totalRowsProcessed = rows.length - 1;
        const validRowsCount = transformedData.length;
        const ignoredRowsCount = totalRowsProcessed - validRowsCount;
        if (validationErrors.length > 0) {
          const errorMsg = `Foram encontrados ${validationErrors.length} erros de validação. ${ignoredRowsCount} registros foram ignorados.\nPrimeiros erros:\n${validationErrors
            .slice(0, 10)
            .join('\n')}${
            validationErrors.length > 10 ? `\n...e mais ${validationErrors.length - 10}.` : ''
          }`;
          setMessage({
            text: errorMsg + (validRowsCount > 0 ? `\nEnviando ${validRowsCount} registros válidos...` : ''),
            type: validRowsCount > 0 ? 'warning' : 'error',
          });
        }
        if (validRowsCount > 0) {
          if (validationErrors.length === 0) {
            setMessage({
              text: `Enviando ${validRowsCount} registros para o banco de dados...`,
              type: 'info',
            });
          }
          const { error } = await insertCallRecords(transformedData);
          if (error) {
            const dbErrorMsg = `Erro ao inserir registros no banco: ${error.message}`;
            if (validationErrors.length > 0) {
              setMessage(prev => ({
                text: prev.text + `\n${dbErrorMsg}`,
                type: 'error'
              }));
            } else {
              setMessage({ text: dbErrorMsg, type: 'error' });
            }
            throw error;
          }
          const successMessage = `${validRowsCount} registros importados com sucesso!`;
          const summaryMessage = validationErrors.length > 0
            ? `${successMessage} (${ignoredRowsCount} inválidos ignorados).`
            : successMessage;
          setMessage({
            text: summaryMessage,
            type: 'success',
          });
        } else if (validationErrors.length === 0) {
          setMessage({
            text: 'O arquivo não contém dados válidos para importação após o cabeçalho.',
            type: 'error'
          });
        }
        setSelectedFile(null);
        if (document.getElementById('file-upload-input')) {
          document.getElementById('file-upload-input').value = null;
        }
        if (onUploadComplete) {
          onUploadComplete();
        }
      } catch (err) {
        if (!message.text.includes('Erro:')) {
          setMessage({ text: `Erro: ${err.message}`, type: 'error' });
        } else if (message.type !== 'error') {
          setMessage(prev => ({ ...prev, type: 'error' }));
        }
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }, [selectedFile, onUploadComplete, message.text, message.type]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200 mb-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-3">
        Upload de Dados (XLSX/CSV)
      </h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <label
          htmlFor="file-upload-input"
          className={`btn btn-secondary flex-shrink-0 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title={isLoading ? 'Processando...' : 'Selecionar arquivo Excel ou CSV'}
        >
          <i className="fas fa-file-excel mr-2"></i> Selecionar Arquivo
          <input
            id="file-upload-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
          />
        </label>
        <button
          onClick={handleUpload}
          className={`btn btn-primary w-full sm:w-auto ${
            !selectedFile || isLoading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-700'
          }`}
          disabled={!selectedFile || isLoading}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>Processando...
            </>
          ) : (
            <>
              <i className="fas fa-upload mr-2"></i>Enviar
            </>
          )}
        </button>
      </div>
      {message.text && (
        <p
          className={`mt-3 text-sm whitespace-pre-line ${
            message.type === 'error'
              ? 'text-red-600'
              : message.type === 'success'
              ? 'text-green-600'
              : message.type === 'warning'
              ? 'text-yellow-600'
              : 'text-slate-600'
          } flex items-start`}
        >
          <i
            className={`fas fa-${
              message.type === 'error'
                ? 'exclamation-circle'
                : message.type === 'success'
                ? 'check-circle'
                : message.type === 'warning'
                ? 'exclamation-triangle'
                : 'info-circle'
            } mr-2 mt-1`}
          ></i>
          {message.text}
        </p>
      )}
    </div>
  );
}

export default FileUpload;