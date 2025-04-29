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

  const parseFlexibleDateTime = (dateTimeInput) => {
    if (dateTimeInput === null || dateTimeInput === undefined || dateTimeInput === '') return null;

    let dateTimeStr = String(dateTimeInput).trim();
    let dateObj = null;

    if (typeof dateTimeInput === 'number' && dateTimeInput > 1) {
      try {
        dateObj = XLSX.SSF.parse_date_code(dateTimeInput, { date1904: false });
        if (dateObj) {
          dateObj = new Date(
            Date.UTC(
              dateObj.y,
              dateObj.m - 1,
              dateObj.d,
              dateObj.H || 0,
              dateObj.M || 0,
              dateObj.S || 0
            )
          );
        }
      } catch (e) {
        console.warn(`Failed to parse Excel date serial ${dateTimeInput}:`, e);
        dateObj = null;
      }
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      const match = dateTimeStr.match(
        /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2}|\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
      );
      if (match) {
        let [, part1, part2, year, hours, minutes, seconds] = match;
        seconds = seconds ? parseInt(seconds, 10) : 0;

        let day, month;
        const yearInt = parseInt(year, 10);
        const part1Int = parseInt(part1, 10);
        const part2Int = parseInt(part2, 10);

        if (yearInt < 100) {
             year = 2000 + yearInt;
        } else {
             year = yearInt;
        }

        if (part1Int > 12 && part2Int <= 12) {
            day = part1Int;
            month = part2Int;
        } else if (part2Int > 12 && part1Int <= 12) {
             month = part1Int;
             day = part2Int;
        } else {
            day = part1Int;
            month = part2Int;
        }

        try {
          dateObj = new Date(Date.UTC(year, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), seconds));
        } catch (e) {
          console.error(`Error creating Date object from "${dateTimeStr}" with assumed D/M/Y:`, e);
          dateObj = null;
        }

        if (!dateObj || isNaN(dateObj.getTime())) {
             if (part1Int <= 12 && part2Int <= 12 && part1Int !== part2Int) {
                  console.warn(`D/M/Y parsing failed for "${dateTimeStr}". Trying M/D/Y.`);
                  day = part2Int;
                  month = part1Int;
                  try {
                       dateObj = new Date(Date.UTC(year, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), seconds));
                  } catch(e) {
                        console.error(`Error creating Date object from "${dateTimeStr}" with M/D/Y:`, e);
                        dateObj = null;
                  }
             }
        }

      }
    }

    if (dateObj && !isNaN(dateObj.getTime())) {
      return dateObj.toISOString();
    } else {
      console.warn(`Could not parse date/time: "${dateTimeInput}" (original type: ${typeof dateTimeInput})`);
      return null;
    }
  };

  const timeToSeconds = (timeInput) => {
    if (timeInput === null || timeInput === undefined || timeInput === '') return null;

     if (typeof timeInput === 'number' && timeInput >= 0 && timeInput < 1) {
         console.log(`timeToSeconds input is number (likely Excel time): ${timeInput}`);
         const secondsInDay = 24 * 60 * 60;
         return Math.round(timeInput * secondsInDay);
     }

    let timeStr = String(timeInput).trim();
    console.log(`timeToSeconds input string: "${timeStr}"`);


    const durationMatch = timeStr.match(/^(\d+):(\d{2}):(\d{2})$/);
    if (durationMatch) {
        console.log(`timeToSeconds matched HH:MM:SS format: "${timeStr}"`);
        const [, hoursStr, minutesStr, secondsStr] = durationMatch;
        const h = parseInt(hoursStr, 10);
        const m = parseInt(minutesStr, 10);
        const s = parseInt(secondsStr, 10);

         if (isNaN(h) || isNaN(m) || isNaN(s) || h < 0 || m < 0 || m > 59 || s < 0 || s > 59) {
              console.warn(`Tempo (duração) inválido (componentes fora do intervalo): "${timeInput}"`);
              return null;
         }

        const totalSeconds = h * 3600 + m * 60 + s;
        console.log(`Calculated total seconds from HH:MM:SS: ${totalSeconds}`);
        return totalSeconds;
    }

     const minuteDurationMatch = timeStr.match(/^(\d+):(\d{2})$/);
      if (minuteDurationMatch) {
           console.log(`timeToSeconds matched HH:MM format: "${timeStr}"`);
           const [, hoursStr, minutesStr] = minuteDurationMatch;
           const h = parseInt(hoursStr, 10);
           const m = parseInt(minutesStr, 10);

            if (isNaN(h) || isNaN(m) || h < 0 || m < 0 || m > 59) {
                 console.warn(`Tempo (duração) inválido (componentes fora do intervalo): "${timeInput}"`);
                 return null;
            }

           const totalSeconds = h * 3600 + m * 60;
           console.log(`Calculated total seconds from HH:MM: ${totalSeconds}`);
           return totalSeconds;
      }


    console.warn(`Formato de tempo (duração) inválido: "${timeInput}". Did not match HH:MM:SS or HH:MM.`);
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


        console.log('Raw rows (from raw:true read, first 5):', rowsRaw.slice(0, 5));
        console.log('Formatted rows (from raw:false read, first 5):', rows.slice(0, 5));


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
          console.error('Header Map:', headerMap);
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

             if (index < 5) {
                 console.log(`--- Processing Row ${rowNum} ---`);
                 console.log(`Raw Timestamp (Col ${headerMap.call_timestamp}): "${rawTimestamp}" (type: ${typeof rawTimestamp})`);
                 console.log(`Raw Duration (Mapped Col ${headerMap.duration_seconds}, Formatted): "${rawDurationFormatted}" (type: ${typeof rawDurationFormatted})`);
                  console.log(`Raw Duration (Mapped Col ${headerMap.duration_seconds}, Raw): "${rawDurationRaw}" (type: ${typeof rawDurationRaw})`);
                 console.log(`Raw Col B (Index 1, Formatted): "${rawRowFormatted[1]}" (type: ${typeof rawRowFormatted[1]})`);
                 console.log(`Raw Col D (Index 3, Formatted): "${rawRowFormatted[3]}" (type: ${typeof rawRowFormatted[3]})`);
                 console.log(`Raw Col B (Index 1, Raw): "${rawRowRaw[1]}" (type: ${typeof rawRowRaw[1]})`);
                 console.log(`Raw Col D (Index 3, Raw): "${rawRowRaw[3]}" (type: ${typeof rawRowRaw[3]})`);

                 console.log(`Raw CPF/CNPJ (Col ${headerMap.cpf_cnpj}): "${rawCpfCnpj}" (type: ${typeof rawCpfCnpj})`);
                 console.log(`Raw UF (Col ${headerMap.uf}): "${rawUf}" (type: ${typeof rawUf})`);
                 console.log(`Raw User Group (Col ${headerMap.user_group}): "${rawUserGroup}" (type: ${typeof rawUserGroup})`);
                 console.log(`Raw Operator (Col ${headerMap.operator_name}): "${rawOperator}" (type: ${typeof rawOperator})`);
                 console.log(`Raw Tabulation (Col ${headerMap.tabulation}): "${rawTabulation}" (type: ${typeof rawTabulation})`);
             }


            record.call_timestamp = parseFlexibleDateTime(rawTimestamp);
            if (record.call_timestamp === null) {
              rowErrors.push(`Data/Hora inválida ("${rawTimestamp}")`);
              rowHasError = true;
            }
             if (index < 5) console.log(`Parsed Timestamp: ${record.call_timestamp}`);


            let parsedDuration = null;
            if (typeof rawDurationRaw === 'number' && rawDurationRaw >= 0 && rawDurationRaw < 1) {
                const secondsInDay = 24 * 60 * 60;
                parsedDuration = Math.round(rawDurationRaw * secondsInDay);
                 console.log(`Parsed duration from raw number: ${parsedDuration}`);
            } else {
                 parsedDuration = timeToSeconds(rawDurationFormatted);
                 console.log(`Parsed duration from formatted string: ${parsedDuration}`);
            }

            record.duration_seconds = parsedDuration;


            if (record.duration_seconds === null) {
                 rowErrors.push(`Duração inválida ("${rawDurationFormatted}" / raw: ${rawDurationRaw})`);
                 rowHasError = true;
            } else if (record.duration_seconds < 0) {
                 rowErrors.push(`Duração negativa ("${rawDurationFormatted}" / raw: ${rawDurationRaw})`);
                 rowHasError = true;
            }
             if (index < 5) console.log(`Final Parsed Duration: ${record.duration_seconds}`);


            record.cpf_cnpj = rawCpfCnpj ? String(rawCpfCnpj).trim() : null;
            record.uf = rawUf ? String(rawUf).trim().toUpperCase() : null;
            record.user_group = rawUserGroup ? String(rawUserGroup).trim() : null;
            record.operator_name = rawOperator ? String(rawOperator).trim() : null;
            record.tabulation = rawTabulation ? String(rawTabulation).trim() : null;

             if (index < 5) {
                 console.log(`Processed CPF/CNPJ: "${record.cpf_cnpj}"`);
                 console.log(`Processed UF: "${record.uf}"`);
                 console.log(`Processed User Group: "${record.user_group}"`);
                 console.log(`Processed Operator: "${record.operator_name}"`);
                 console.log(`Processed Tabulation: "${record.tabulation}"`);
             }

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
                 console.error(`Row ${rowNum} validation failed. Errors:`, rowErrors);
                validationErrors.push(`Linha ${rowNum}: ${rowErrors.join(', ')}`);
                 return null;
            } else {
                 if (index < 5) console.log(`Row ${rowNum} valid.`);
                 return record;
            }
          })
          .filter((record) => record !== null);

        console.log(
          'Transformed data for insertion (first 5 valid):',
          transformedData.slice(0, 5)
        );
         console.log(`Total valid rows for insertion: ${transformedData.length}`);


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
        console.error('Erro durante o upload:', err);
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
          title={ isLoading ? 'Processando...' : 'Selecionar arquivo Excel ou CSV' }
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
              : 'text-slate-600'
          } flex items-start`}
        >
          <i
            className={`fas fa-${
              message.type === 'error'
                ? 'exclamation-circle'
                : message.type === 'success'
                ? 'check-circle'
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