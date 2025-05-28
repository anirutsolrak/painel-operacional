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
      // console.log('[formatExcelDateToISO] Input é nulo ou vazio, retornando null.');
      return null;
    }
    // console.log(`[formatExcelDateToISO] Input recebido: ${excelDateInput} (tipo: ${typeof excelDateInput})`);

    let date;
    if (excelDateInput instanceof Date) {
      // console.log('[formatExcelDateToISO] Input é uma instância de Date.');
      date = excelDateInput;
    } else if (typeof excelDateInput === 'number') {
      // console.log('[formatExcelDateToISO] Input é um número (serial Excel).');
      // Para números Excel, o XLSX.SSF.parse_date_code extrai os componentes
      // de data/hora como se fossem locais ao fuso horário em que o número foi gerado,
      // mas a função Date.UTC os usa para construir um timestamp UTC.
      const parsed = XLSX.SSF.parse_date_code(excelDateInput);
      if (!parsed) {
        // console.warn('[formatExcelDateToISO] Falha ao parsear número serial do Excel:', excelDateInput);
        return null;
      }
      // console.log('[formatExcelDateToISO] Serial parseado:', parsed);
      // Cria uma data UTC com os componentes extraídos.
      // Se o Excel não tiver hora (ex: só data), H, M, S serão 0.
      date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0));
    } else if (typeof excelDateInput === 'string') {
      // console.log('[formatExcelDateToISO] Input é uma string.');
      let parsedDate = new Date(excelDateInput); // Tenta parsear diretamente
      
      // Se o parse direto resultar em Data Inválida, tenta com regex
      // A regex tenta capturar formatos como DD/MM/YYYY HH:MM:SS ou DD-MM-YYYY HH:MM:SS
      // e usa os componentes capturados como UTC.
      if (isNaN(parsedDate.getTime())) {
        // console.log('[formatExcelDateToISO] Parse direto da string falhou, tentando regex.');
                                    // dia   mês    ano       hora    minuto   segundo (opcional)
        const parts = excelDateInput.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?(?:\.\d+)?Z?$/);
        if (parts) {
          // console.log('[formatExcelDateToISO] Regex encontrou partes:', parts);
          const day = parseInt(parts[1], 10);
          const month = parseInt(parts[2], 10);
          // Garante ano com 4 dígitos
          const yearStr = parts[3];
          const year = yearStr.length === 2 ? parseInt(`20${yearStr}`, 10) : parseInt(yearStr, 10);
          
          const hour = parts[4] ? parseInt(parts[4], 10) : 0;
          const minute = parts[5] ? parseInt(parts[5], 10) : 0;
          const second = parts[6] ? parseInt(parts[6], 10) : 0;

          // Constrói a data como UTC
          parsedDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
          // console.log(`[formatExcelDateToISO] Data construída via regex (UTC): Y=${year}, M=${month-1}, D=${day}, H=${hour}, Min=${minute}, S=${second} -> ${parsedDate.toISOString()}`);

        } else {
          // console.log('[formatExcelDateToISO] Regex não encontrou partes, tentando substituir espaço por T.');
          // Última tentativa: se a string for tipo "YYYY-MM-DD HH:MM:SS", new Date() interpreta como local.
          // Para forçar UTC, precisaria do 'Z' ou manipular os componentes.
          // A tentativa com replace(' ', 'T') é para "YYYY-MM-DDTHH:MM:SS" que new Date() também trata como local.
          const isoAttemptWithSpace = excelDateInput.replace(' ', 'T');
          parsedDate = new Date(isoAttemptWithSpace);
          if (!isNaN(parsedDate.getTime())) {
            // Se for interpretado como local, converter para UTC explicitamente:
            // Isso só faz sentido se a string realmente representar uma hora local.
            // Como o objetivo é obter um ISO string UTC, e new Date(string_sem_Z) é local,
            // uma abordagem mais segura seria não fazer isso e retornar null se os outros métodos falharem
            // ou exigir que a string já esteja em formato ISO UTC (com Z).
            // Por enquanto, vamos manter a lógica original, que pode ser problemática aqui.
            // O ideal seria que strings já viessem em formato UTC ou tivéssemos o fuso de origem.
            // console.warn('[formatExcelDateToISO] String parseada após replace T, mas pode ser local:', parsedDate.toISOString());
          }
        }
      }
      date = parsedDate;
    } else {
      // console.warn('[formatExcelDateToISO] Tipo de input não suportado:', typeof excelDateInput);
      return null;
    }

    if (isNaN(date.getTime())) {
      // console.warn('[formatExcelDateToISO] Data resultante é inválida para o input:', excelDateInput);
      return null;
    }
    const isoString = date.toISOString();
    // console.log(`[formatExcelDateToISO] Data final (ISO UTC): ${isoString}`);
    return isoString;
  };

  const timeToSeconds = (timeInput) => {
    if (timeInput === null || timeInput === undefined || timeInput === '') return null;
    // Se for número entre 0 e 1, é uma fração do dia (formato Excel para tempo)
    if (typeof timeInput === 'number' && timeInput >= 0 && timeInput < 1) {
      const secondsInDay = 24 * 60 * 60;
      return Math.round(timeInput * secondsInDay);
    }

    let timeStr = String(timeInput).trim();
    // Formato HH:MM:SS
    const durationMatch = timeStr.match(/^(\d+):(\d{2}):(\d{2})$/);
    if (durationMatch) {
      const [, hoursStr, minutesStr, secondsStr] = durationMatch;
      const h = parseInt(hoursStr, 10);
      const m = parseInt(minutesStr, 10);
      const s = parseInt(secondsStr, 10);
      if (isNaN(h) || isNaN(m) || isNaN(s) || h < 0 || m < 0 || m > 59 || s < 0 || s > 59) {
        return null;
      }
      return h * 3600 + m * 60 + s;
    }

    // Formato MM:SS (interpretado como minutos e segundos) - CUIDADO: pode colidir com HH:MM
    // Para evitar colisão, podemos ser mais estritos ou remover este caso se não for necessário.
    // Assumindo que se não tiver 3 partes, pode ser MM:SS
    const minuteDurationMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (minuteDurationMatch) {
        const [, minutesStr, secondsStr] = minuteDurationMatch;
        const m = parseInt(minutesStr, 10);
        const s = parseInt(secondsStr, 10);
        if (isNaN(m) || isNaN(s) || m < 0 || m > 59 || s < 0 || s > 59) { // m < 0 não deveria acontecer com \d+
            return null;
        }
        return m * 60 + s; // Interpretado como Minutos:Segundos
    }
    // Se for apenas um número, assumir que são segundos (se não for fração de dia)
    if (/^\d+$/.test(timeStr)) {
        const numSeconds = parseInt(timeStr, 10);
        if (!isNaN(numSeconds) && numSeconds >=0) return numSeconds;
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

        // Leitura para valores BRUTOS (especialmente para números de data/hora)
        const workbookRaw = XLSX.read(data, { type: 'binary', raw: true, cellDates: false });
        const sheetNameRaw = workbookRaw.SheetNames[0];
        const worksheetRaw = workbookRaw.Sheets[sheetNameRaw];
        const rowsRaw = XLSX.utils.sheet_to_json(worksheetRaw, {
          header: 1,
          raw: true, // Importante: obtém o valor bruto da célula
          defval: null,
        });

        // Leitura para valores FORMATADOS (para strings como UF, Operador, etc.)
        // `cellDates: false` para evitar que a lib já converta para JS Dates locais.
        const workbookFormatted = XLSX.read(data, { type: 'binary', raw: false, cellDates: false });
        const sheetNameFormatted = workbookFormatted.SheetNames[0];
        const worksheetFormatted = workbookFormatted.Sheets[sheetNameFormatted];
        const rowsFormatted = XLSX.utils.sheet_to_json(worksheetFormatted, {
          header: 1,
          raw: false, // Obtém o valor como string formatada
          defval: null,
        });

        if (rowsRaw.length < 2 || rowsFormatted.length < 2) { // Verifica ambas as leituras
          throw new Error('Planilha vazia ou sem dados.');
        }

        // Usa o cabeçalho de rowsFormatted (strings) para mapeamento
        const headerRow = rowsFormatted[0].map((h) => h ? String(h).trim() : null);
        const normalizeHeader = (header) => header ? String(header).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '') : null;
        
        const headerMap = {
          call_timestamp: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('Envio da Ligação')),
          duration_seconds: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('Tempo')),
          cpf_cnpj: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('CPF / CNPJ')),
          uf: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('UF')),
          user_group: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('Grupo Usuário')),
          operator_name: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('Operador')),
          tabulation: headerRow.findIndex((h) => normalizeHeader(h) === normalizeHeader('Tabulado Como')),
        };
        
        const requiredHeadersForMap = ['Envio da Ligação', 'Tempo', 'UF', 'Grupo Usuário', 'Operador', 'Tabulado Como'];
        const missingHeaders = requiredHeadersForMap.filter(hKey => headerMap[hKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '')] === -1);

        // Validação de cabeçalho mais robusta
        let missingHeaderMessages = [];
        if (headerMap.call_timestamp === -1) missingHeaderMessages.push('Envio da Ligação');
        if (headerMap.duration_seconds === -1) missingHeaderMessages.push('Tempo');
        // Adicione outras colunas obrigatórias aqui se necessário para o mapeamento
        
        if (missingHeaderMessages.length > 0) {
          throw new Error(`Cabeçalho inválido. Colunas esperadas não encontradas: ${missingHeaderMessages.join(', ')}`);
        }
        
        setMessage({
          text: `Processando ${rowsRaw.length - 1} linhas...`,
          type: 'info',
        });

        validationErrors = [];
        transformedData = rowsRaw // Itera sobre rowsRaw para ter acesso aos valores brutos
          .slice(1) // Pula o cabeçalho
          .map((rowRawData, index) => {
            const rowNum = index + 2; // Número da linha no Excel
            const record = {};
            let rowHasError = false;
            const rowErrors = [];

            // Pega a linha correspondente dos dados formatados
            const rowFormattedData = rowsFormatted[index + 1]; 
            if (!rowFormattedData) {
              validationErrors.push(`Linha ${rowNum}: Dados formatados ausentes correspondentes aos dados brutos.`);
              return null; // Pula esta linha se não houver correspondência
            }

            // **MUDANÇA PRINCIPAL AQUI para call_timestamp**
            // Usa o valor bruto (de rowsRaw) para o timestamp.
            // Se for um número serial do Excel, formatExcelDateToISO lidará com ele.
            // Se for uma string, formatExcelDateToISO tentará parseá-la.
            const rawTimestampValue = rowRawData[headerMap.call_timestamp];
            // console.log(`Linha ${rowNum}, Coluna 'Envio da Ligação' (bruto):`, rawTimestampValue, typeof rawTimestampValue);
            record.call_timestamp = formatExcelDateToISO(rawTimestampValue);
            if (record.call_timestamp === null) {
              rowErrors.push(`Data/Hora inválida ("${rawTimestampValue}")`);
              rowHasError = true;
            }

            // Para duration_seconds, podemos usar o valor bruto (se for número Excel) ou formatado
            const rawDurationValue = rowRawData[headerMap.duration_seconds]; // Valor bruto
            const formattedDurationValue = rowFormattedData[headerMap.duration_seconds]; // Valor formatado
            // console.log(`Linha ${rowNum}, Coluna 'Tempo' (bruto):`, rawDurationValue, typeof rawDurationValue);
            // console.log(`Linha ${rowNum}, Coluna 'Tempo' (formatado):`, formattedDurationValue, typeof formattedDurationValue);
            
            // Prioriza o valor bruto se for número (fração de dia Excel), senão tenta o formatado.
            let durationToParse = (typeof rawDurationValue === 'number') ? rawDurationValue : formattedDurationValue;
            record.duration_seconds = timeToSeconds(durationToParse);
            if (record.duration_seconds === null) {
              rowErrors.push(`Duração inválida (bruto:"${rawDurationValue}", formatado:"${formattedDurationValue}")`);
              rowHasError = true;
            } else if (record.duration_seconds < 0) {
              rowErrors.push(`Duração negativa (bruto:"${rawDurationValue}", formatado:"${formattedDurationValue}")`);
              rowHasError = true;
            }

            // Para campos de texto, geralmente usamos os valores formatados (de rowsFormatted)
            record.cpf_cnpj = rowFormattedData[headerMap.cpf_cnpj] ? String(rowFormattedData[headerMap.cpf_cnpj]).trim() : null;
            record.uf = rowFormattedData[headerMap.uf] ? String(rowFormattedData[headerMap.uf]).trim().toUpperCase() : null;
            record.user_group = rowFormattedData[headerMap.user_group] ? String(rowFormattedData[headerMap.user_group]).trim() : null;
            record.operator_name = rowFormattedData[headerMap.operator_name] ? String(rowFormattedData[headerMap.operator_name]).trim() : null;
            record.tabulation = rowFormattedData[headerMap.tabulation] ? String(rowFormattedData[headerMap.tabulation]).trim() : null;

            // Validações de campos obrigatórios (texto)
            if (!record.uf) { rowErrors.push(`UF ausente.`); rowHasError = true; }
            if (!record.user_group) { rowErrors.push(`Grupo Usuário ausente.`); rowHasError = true; }
            if (!record.operator_name) { rowErrors.push(`Operador ausente.`); rowHasError = true; }
            if (!record.tabulation) { rowErrors.push(`Tabulação ausente.`); rowHasError = true; }

            if (rowHasError) {
              validationErrors.push(`Linha ${rowNum}: ${rowErrors.join('; ')}`);
              return null;
            }
            return record;
          })
          .filter((record) => record !== null);

        if (transformedData.length === 0 && validationErrors.length === 0) {
          throw new Error('Nenhum dado válido encontrado no arquivo.');
        }
        
        const totalRowsProcessed = rowsRaw.length - 1;
        const validRowsCount = transformedData.length;
        const ignoredRowsCount = totalRowsProcessed - validRowsCount;

        if (validationErrors.length > 0) {
          const errorMsg = `Foram encontrados ${validationErrors.length} erros de validação. ${ignoredRowsCount} registros foram ignorados.\nPrimeiros erros:\n${validationErrors
            .slice(0, 5) // Mostra menos erros para não poluir demais
            .join('\n')}${
            validationErrors.length > 5 ? `\n...e mais ${validationErrors.length - 5}. Verifique o console para todos os erros.` : ''
          }`;
          console.warn("Erros de validação detalhados:", validationErrors);
          setMessage({
            text: errorMsg + (validRowsCount > 0 ? `\nEnviando ${validRowsCount} registros válidos...` : '\nNenhum registro válido para enviar.'),
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
            console.error("Erro do Supabase ao inserir:", error);
            setMessage(prev => ({
                text: (prev.type === 'warning' ? prev.text.split('\nEnviando')[0] + '\n' : '') + dbErrorMsg,
                type: 'error'
            }));
            // Não lança o erro aqui para permitir que a mensagem de erro do DB seja mostrada
          } else {
            const successMessage = `${validRowsCount} registros importados com sucesso!`;
            const summaryMessage = validationErrors.length > 0
              ? `${successMessage} (${ignoredRowsCount} inválidos ignorados).`
              : successMessage;
            setMessage({ text: summaryMessage, type: 'success' });
            if (onUploadComplete) onUploadComplete(); // Chama apenas no sucesso total da inserção
          }
        } else if (validationErrors.length === 0) { // Nenhum dado válido, e nenhum erro de validação (planilha pode estar vazia após cabeçalho)
          setMessage({
            text: 'O arquivo não contém dados válidos para importação após o cabeçalho.',
            type: 'error'
          });
        }
        // Limpa o input de arquivo apenas se não houve erro de banco e pelo menos alguns dados válidos foram processados
        // ou se não havia dados válidos mas também não houve erro de validação (ex: planilha vazia)
        if (!message.text.includes("Erro ao inserir registros no banco") || (validRowsCount === 0 && validationErrors.length === 0)) {
            setSelectedFile(null);
            if (document.getElementById('file-upload-input')) {
                document.getElementById('file-upload-input').value = null;
            }
        }

      } catch (err) {
        console.error("Erro geral no upload:", err);
        // Não sobrescreve a mensagem se já for um erro específico
        if (!message.text.includes('Erro:') || message.type !== 'error') {
            setMessage({ text: `Erro: ${err.message}`, type: 'error' });
        }
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }, [selectedFile, onUploadComplete, message.text, message.type]); // Adicionei message aqui para evitar stale closures se houver lógica dependente

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
            } mr-2 mt-1 flex-shrink-0`} // Adicionado flex-shrink-0
          ></i>
          <span className="break-words">{message.text}</span> {/* Para quebra de linha em mensagens longas */}
        </p>
      )}
    </div>
  );
}

export default FileUpload;