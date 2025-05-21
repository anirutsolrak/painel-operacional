import { createClient } from '@supabase/supabase-js';

let supabaseClientInstance = null;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getSupabaseClient() {
    if (supabaseClientInstance) {
        return supabaseClientInstance;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            auth: {
                getSession: async () => ({ data: { session: null } }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
                signOut: async () => ({ error: null }),
                getUser: async () => ({ data: { user: null } }),
            },
            from: () => ({
                insert: () => ({ select: () => ({ select: async () => ({ data: [], error: new Error("Supabase client not configured.") }) }) }),
                select: () => ({ eq: () => ({ order: () => ({ then: async () => ({ data: [], error: new Error("Supabase client not configured.") }) }) }) })
            }),
            rpc: () => async () => ({ data: null, error: new Error("Supabase client not configured.") })
        };
    }

    try {
        supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
        return supabaseClientInstance;
    } catch (error) {
        return {
            auth: {
                getSession: async () => ({ data: { session: null } }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
                signOut: async () => ({ error: null }),
                getUser: async () => ({ data: { user: null } }),
            },
            from: () => ({
                insert: () => ({ select: () => ({ select: async () => ({ data: [], error: new Error("Supabase client creation failed.") }) }) }),
                select: () => ({ eq: () => ({ order: () => ({ then: async () => ({ data: [], error: new Error("Supabase client creation failed.") }) }) }) })
            }),
            rpc: () => async () => ({ data: null, error: new Error("Supabase client creation failed.") })
        };
    }
}

export default getSupabaseClient;

export async function insertCallRecords(records) {
    if (!records?.length) {
        return { data: null, error: new Error("Nenhum registro fornecido") };
    }

    const supabase = getSupabaseClient();

    let userId = null;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userId = user.id;
        }
    } catch (authError) {
        userId = null;
    }

    const recordsWithMetadata = records.map(record => ({
        ...record,
        uploaded_by: userId
    }));

    try {
        const { data, error } = await supabase
            .from('call_records')
            .insert(recordsWithMetadata)
            .select();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function fetchDashboardMetricsWithTrend(filters) {
    const supabase = getSupabaseClient();

    try {
        let query = supabase.from('call_records').select('*');

        // Only add date filters if valid dates are provided
        if (filters.currentFilters.start_date && filters.currentFilters.start_date !== '') {
            query = query.gte('call_timestamp', filters.currentFilters.start_date);
        }
        if (filters.currentFilters.end_date && filters.currentFilters.end_date !== '') {
            query = query.lte('call_timestamp', filters.currentFilters.end_date);
        }

        if (filters.currentFilters.filter_state) {
            query = query.eq('uf', filters.currentFilters.filter_state);
        }
        if (filters.currentFilters.filter_operator_name) {
            query = query.eq('operator_name', filters.currentFilters.filter_operator_name);
        }
        if (filters.currentFilters.filter_region) {
            query = query.eq('region', filters.currentFilters.filter_region);
        }

        const { data: currentData, error: currentError } = await query;

        if (currentError) throw currentError;

        // Fetch previous period data
        let previousQuery = supabase.from('call_records').select('*');

        // Only add date filters if valid dates are provided
        if (filters.previousFilters.start_date && filters.previousFilters.start_date !== '') {
            previousQuery = previousQuery.gte('call_timestamp', filters.previousFilters.start_date);
        }
        if (filters.previousFilters.end_date && filters.previousFilters.end_date !== '') {
            previousQuery = previousQuery.lte('call_timestamp', filters.previousFilters.end_date);
        }

        if (filters.previousFilters.filter_state) {
            previousQuery = previousQuery.eq('uf', filters.previousFilters.filter_state);
        }
        if (filters.previousFilters.filter_operator_name) {
            previousQuery = previousQuery.eq('operator_name', filters.previousFilters.filter_operator_name);
        }
        if (filters.previousFilters.filter_region) {
            previousQuery = previousQuery.eq('region', filters.previousFilters.filter_region);
        }

        const { data: previousData, error: previousError } = await previousQuery;

        if (previousError) throw previousError;

        // Process current period metrics
        const currentMetrics = processMetrics(currentData || []);
        const previousMetrics = processMetrics(previousData || []);

        return {
            current: currentMetrics,
            previous: previousMetrics,
            error: null
        };
    } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        return { current: null, previous: null, error };
    }
}

function processMetrics(data) {
    if (!data || data.length === 0) {
        return {
            totalLigações: 0,
            ligaçõesAtendidasCount: 0,
            ligaçõesAbandonadasCount: 0,
            ligaçõesFalhaCount: 0,
            sucessoTabulacoesCount: 0,
            tempoPerdidoSegundos: 0,
            tma: 0,
            taxaSucesso: 0,
            taxaAbandono: 0,
            taxaNaoEfetivo: 0
        };
    }

    const totalCalls = data.length;
    const attendedCalls = data.filter(call => call.duration_seconds > 0).length;
    const abandonedCalls = data.filter(call => call.duration_seconds === 0).length;
    const failedCalls = data.filter(call => !call.duration_seconds).length;
    const successfulTabulations = data.filter(call => 
        call.tabulation && 
        !['telefone incorreto', 'recusa', 'agendamento grupo', 'caixa postal', 'ligação caiu', 
         'cliente ausente', 'cliente desligou', 'ligação muda'].includes(call.tabulation.toLowerCase())
    ).length;

    const totalDuration = data.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
    const averageCallDuration = attendedCalls > 0 ? totalDuration / attendedCalls : 0;

    const lostTimeTabulations = ['telefone incorreto', 'recusa', 'agendamento grupo', 'caixa postal', 
                                'ligação caiu', 'cliente ausente', 'cliente desligou', 'ligação muda'];
    const lostTimeCalls = data.filter(call => 
        call.tabulation && 
        lostTimeTabulations.includes(call.tabulation.toLowerCase())
    );
    const totalLostTime = lostTimeCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);

    return {
        totalLigações: totalCalls,
        ligaçõesAtendidasCount: attendedCalls,
        ligaçõesAbandonadasCount: abandonedCalls,
        ligaçõesFalhaCount: failedCalls,
        sucessoTabulacoesCount: successfulTabulations,
        tempoPerdidoSegundos: totalLostTime,
        tma: averageCallDuration,
        taxaSucesso: totalCalls > 0 ? successfulTabulations / totalCalls : 0,
        taxaAbandono: totalCalls > 0 ? abandonedCalls / totalCalls : 0,
        taxaNaoEfetivo: totalCalls > 0 ? failedCalls / totalCalls : 0
    };
}

export async function fetchStatusDistribution(filters) {
    const supabase = getSupabaseClient();
    try {
        let query = supabase.from('call_records').select('*');

        if (filters.start_date && filters.start_date !== '') {
            query = query.gte('call_timestamp', filters.start_date);
        }
        if (filters.end_date && filters.end_date !== '') {
            query = query.lte('call_timestamp', filters.end_date);
        }

        if (filters.filter_state) {
            query = query.eq('uf', filters.filter_state);
        }
        if (filters.filter_operator_name) {
            query = query.eq('operator_name', filters.filter_operator_name);
        }
        if (filters.filter_region) {
            query = query.eq('region', filters.filter_region);
        }

        const { data, error } = await query;

        if (error) throw error;

        const distribution = processStatusDistribution(data || []);
        return { data: distribution, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

function processStatusDistribution(data) {
    const statuses = data.reduce((acc, record) => {
        const status = record.duration_seconds > 0 ? 'Atendida' : 'Não Atendida';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(statuses).map(([status, count]) => ({
        status,
        count
    }));
}

export async function fetchHourlyCallCounts(filters) {
    const supabase = getSupabaseClient();
    try {
        let query = supabase.from('call_records').select('*');

        if (filters.start_date && filters.start_date !== '') {
            query = query.gte('call_timestamp', filters.start_date);
        }
        if (filters.end_date && filters.end_date !== '') {
            query = query.lte('call_timestamp', filters.end_date);
        }

        if (filters.filter_state) {
            query = query.eq('uf', filters.filter_state);
        }
        if (filters.filter_operator_name) {
            query = query.eq('operator_name', filters.filter_operator_name);
        }
        if (filters.filter_region) {
            query = query.eq('region', filters.filter_region);
        }

        const { data, error } = await query;

        if (error) throw error;

        const hourlyData = processHourlyData(data || []);
        return { data: hourlyData, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

function processHourlyData(data) {
    const hourlyCount = Array(24).fill(0);
    
    data.forEach(record => {
        const hour = new Date(record.call_timestamp).getHours();
        hourlyCount[hour]++;
    });

    return hourlyCount.map((chamadas, hora) => ({ hora, chamadas }));
}

export async function fetchTabulationDistribution(filters) {
    const supabase = getSupabaseClient();
    try {
        let query = supabase.from('call_records').select('*');

        if (filters.start_date && filters.start_date !== '') {
            query = query.gte('call_timestamp', filters.start_date);
        }
        if (filters.end_date && filters.end_date !== '') {
            query = query.lte('call_timestamp', filters.end_date);
        }

        if (filters.filter_state) {
            query = query.eq('uf', filters.filter_state);
        }
        if (filters.filter_operator_name) {
            query = query.eq('operator_name', filters.filter_operator_name);
        }
        if (filters.filter_region) {
            query = query.eq('region', filters.filter_region);
        }

        const { data, error } = await query;

        if (error) throw error;

        const distribution = processTabulationDistribution(data || []);
        return { data: distribution, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

function processTabulationDistribution(data) {
    const tabulationCount = data.reduce((acc, record) => {
        if (record.tabulation) {
            acc[record.tabulation] = (acc[record.tabulation] || 0) + 1;
        }
        return acc;
    }, {});

    return Object.entries(tabulationCount)
        .map(([tabulation, count]) => ({ tabulation, count }))
        .sort((a, b) => b.count - a.count);
}

export async function fetchStateMapData(filters) {
    const supabase = getSupabaseClient();
    try {
        let query = supabase.from('call_records').select('*');

        if (filters.start_date && filters.start_date !== '') {
            query = query.gte('call_timestamp', filters.start_date);
        }
        if (filters.end_date && filters.end_date !== '') {
            query = query.lte('call_timestamp', filters.end_date);
        }

        if (filters.filter_operator_name) {
            query = query.eq('operator_name', filters.filter_operator_name);
        }
        if (filters.filter_region) {
            query = query.eq('region', filters.filter_region);
        }

        const { data, error } = await query;

        if (error) throw error;

        const stateData = processStateMapData(data || []);
        return { data: stateData, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

function processStateMapData(data) {
    const stateMetrics = {};

    data.forEach(record => {
        if (!record.uf) return;

        if (!stateMetrics[record.uf]) {
            stateMetrics[record.uf] = {
                uf: record.uf,
                totalLigações: 0,
                sucessoTabulacoesCount: 0
            };
        }

        stateMetrics[record.uf].totalLigações++;

        if (record.tabulation && 
            !['telefone incorreto', 'recusa', 'agendamento grupo', 'caixa postal', 
              'ligação caiu', 'cliente ausente', 'cliente desligou', 'ligação muda']
                .includes(record.tabulation.toLowerCase())) {
            stateMetrics[record.uf].sucessoTabulacoesCount++;
        }
    });

    Object.values(stateMetrics).forEach(state => {
        state.taxaSucesso = state.totalLigações > 0 ? 
            state.sucessoTabulacoesCount / state.totalLigações : 0;
    });

    return Object.values(stateMetrics);
}

export async function fetchOperators() {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase
            .from('call_records')
            .select('operator_name')
            .not('operator_name', 'is', null);

        if (error) throw error;

        const uniqueOperators = [...new Set(data.map(record => record.operator_name))]
            .filter(name => name && name.trim())
            .sort();

        return {
            data: uniqueOperators.map(name => ({
                id: name,
                operator_name: name
            })),
            error: null
        };
    } catch (error) {
        console.error('Error fetching operators:', error);
        return { data: [], error };
    }
}

export async function fetchStates() {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase
            .from('call_records')
            .select('uf')
            .not('uf', 'is', null);

        if (error) throw error;

        const uniqueStates = [...new Set(data.map(record => record.uf))]
            .filter(uf => uf && uf.trim())
            .sort();

        return { data: uniqueStates, error: null };
    } catch (error) {
        return { data: [], error };
    }
}

export async function fetchRegions() {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase
            .from('regions')
            .select('region_name')
            .order('region_name');

        if (error) throw error;

        const regions = data.map(item => item.region_name);
        return { data: regions, error: null };
    } catch (error) {
        return { data: [], error };
    }
}