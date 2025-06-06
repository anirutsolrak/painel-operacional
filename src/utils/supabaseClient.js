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
                select: () => ({ eq: () => ({ order: () => ({ then: async () => ({ data: [], error: new Error("Supabase client not configured.") }) }) }) }),
                delete: () => ({ then: async () => ({ data: [], error: new Error("Supabase client not configured.") }) })
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
                select: () => ({ eq: () => ({ order: () => ({ then: async () => ({ data: [], error: new Error("Supabase client creation failed.") }) }) }) }),
                delete: () => ({ then: async () => ({ data: [], error: new Error("Supabase client creation failed.") }) })
            }),
            rpc: () => async () => ({ data: null, error: new Error("Supabase client creation failed.") })
        };
    }
}

export default getSupabaseClient;

async function fetchAllPages(query) {
    const pageSize = 1000;
    let allData = [];
    let hasMore = true;
    let currentPage = 0;

    while (hasMore) {
        const start = currentPage * pageSize;
        const { data, error } = await query
            .range(start, start + pageSize - 1);

        if (error) throw error;
        
        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            allData = [...allData, ...data];
            if (data.length < pageSize) {
                hasMore = false;
            } else {
                currentPage++;
            }
        }
    }

    return allData;
}

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
        const { error: deleteError } = await supabase
            .from('call_records')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (deleteError) {
            console.error("Erro ao deletar registros antigos:", deleteError);
            return { data: null, error: new Error(`Falha ao limpar dados antigos: ${deleteError.message}`) };
        }

        const { data, error: insertError } = await supabase
            .from('call_records')
            .insert(recordsWithMetadata)
            .select();
        if (insertError) throw insertError;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function fetchDashboardMetricsWithTrend(filters) {
    const supabase = getSupabaseClient();
    try {
        let currentQuery = supabase.from('call_records').select('*');

        if (filters.currentFilters.start_date && filters.currentFilters.start_date !== '') {
            currentQuery = currentQuery.gte('call_timestamp', filters.currentFilters.start_date);
        }
        if (filters.currentFilters.end_date && filters.currentFilters.end_date !== '') {
            currentQuery = currentQuery.lte('call_timestamp', filters.currentFilters.end_date);
        }
        if (filters.currentFilters.filter_state) {
            currentQuery = currentQuery.eq('uf', filters.currentFilters.filter_state);
        }
        if (filters.currentFilters.filter_operator_name) {
            currentQuery = currentQuery.eq('operator_name', filters.currentFilters.filter_operator_name);
        }
        if (filters.currentFilters.filter_region_ufs && filters.currentFilters.filter_region_ufs.length > 0) {
            currentQuery = currentQuery.in('uf', filters.currentFilters.filter_region_ufs);
        }

        const currentData = await fetchAllPages(currentQuery);

        let previousQuery = supabase.from('call_records').select('*');
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
        if (filters.previousFilters.filter_region_ufs && filters.previousFilters.filter_region_ufs.length > 0) {
            previousQuery = previousQuery.in('uf', filters.previousFilters.filter_region_ufs);
        }

        const previousData = await fetchAllPages(previousQuery);

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

    const naoEfetivoTabulations = [
        'cliente ausente',
        'cliente desligou',
        'ligação caiu',
        'ligação muda',
        'caixa postal'
    ];

    const naoEfetivoCalls = data.filter(call =>
        call.tabulation &&
        naoEfetivoTabulations.includes(call.tabulation.toLowerCase())
    ).length;

    const successfulTabulations = data.filter(call =>
        call.tabulation &&
        call.tabulation.toLowerCase() === 'endereço confirmado'
    ).length;

    const attendedCallsDuration = data
        .filter(call => call.duration_seconds > 0)
        .reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
    const averageCallDuration = attendedCalls > 0 ? attendedCallsDuration / attendedCalls : 0;

    const totalLostTime = data
        .filter(call => 
            call.tabulation &&
            naoEfetivoTabulations.includes(call.tabulation.toLowerCase())
        )
        .reduce((sum, call) => sum + (call.duration_seconds || 0), 0);

    return {
        totalLigações: totalCalls,
        ligaçõesAtendidasCount: attendedCalls,
        ligaçõesAbandonadasCount: abandonedCalls,
        ligaçõesFalhaCount: naoEfetivoCalls,
        sucessoTabulacoesCount: successfulTabulations,
        tempoPerdidoSegundos: totalLostTime,
        tma: averageCallDuration,
        taxaSucesso: totalCalls > 0 ? successfulTabulations / totalCalls : 0,
        taxaAbandono: totalCalls > 0 ? abandonedCalls / totalCalls : 0,
        taxaNaoEfetivo: totalCalls > 0 ? naoEfetivoCalls / totalCalls : 0
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
        if (filters.filter_region_ufs && filters.filter_region_ufs.length > 0) {
            query = query.in('uf', filters.filter_region_ufs);
        }

        const data = await fetchAllPages(query);
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
        const { data, error } = await supabase.rpc('get_hourly_call_counts', {
            start_date: filters.start_date,
            end_date: filters.end_date,
            filter_state: filters.filter_state,
            filter_operator_name: filters.filter_operator_name,
            filter_region_ufs: filters.filter_region_ufs
        });

        if (error) {
            console.error("[fetchHourlyCallCounts] RPC error:", error);
            throw error;
        }

        // Initialize array for all hours (0-23)
        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
            hora: i,
            chamadas: 0
        }));

        // Update counts from database results
        if (Array.isArray(data)) {
            data.forEach(item => {
                const hour = parseInt(item.hour);
                if (!isNaN(hour) && hour >= 0 && hour < 24) {
                    hourlyData[hour].chamadas = parseInt(item.call_count) || 0;
                }
            });
        }

        // Filter to only return business hours (8-20)
        const businessHourlyData = hourlyData.filter(item => item.hora >= 8 && item.hora <= 20);

        return { data: businessHourlyData, error: null };
    } catch (error) {
        console.error('Error fetching hourly call counts:', error);
        return { data: [], error };
    }
}

export async function fetchTabulationDistribution(filters) {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase.rpc('get_tabulation_distribution', {
            start_date: filters.start_date,
            end_date: filters.end_date,
            filter_state: filters.filter_state,
            filter_operator_name: filters.filter_operator_name,
            filter_region_ufs: filters.filter_region_ufs
        });

        if (error) {
            console.error("[fetchTabulationDistribution] RPC 'get_tabulation_distribution' error:", error);
            throw error;
        }

        const processedDistribution = Array.isArray(data) ? data.map(item => ({
            label: item.tabulation,
            value: item.total_count || 0
        })) : [];

        return { data: processedDistribution, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

function processTabulationDistribution(data) {
    const tabulationCount = data.reduce((acc, record) => {
        if (record.tabulation) {
            const tabulation = record.tabulation.trim();
            acc[tabulation] = (acc[tabulation] || 0) + 1;
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
        let query = supabase.from('call_records').select('uf, duration_seconds, tabulation');
        if (filters.start_date && filters.start_date !== '') {
            query = query.gte('call_timestamp', filters.start_date);
        }
        if (filters.end_date && filters.end_date !== '') {
            query = query.lte('call_timestamp', filters.end_date);
        }
        if (filters.filter_operator_name) {
            query = query.eq('operator_name', filters.filter_operator_name);
        }
        if (filters.filter_region_ufs && filters.filter_region_ufs.length > 0) {
            query = query.in('uf', filters.filter_region_ufs);
        }

        const data = await fetchAllPages(query);
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
        if (record.tabulation && record.tabulation.toLowerCase() === 'endereço confirmado') {
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
        const { data, error } = await supabase.rpc('get_distinct_operators');

        if (error) {
            console.error("[fetchOperators] RPC 'get_distinct_operators' error:", error);
            throw error;
        }

        let processedOperators = [];
        if (Array.isArray(data)) {
            processedOperators = data.map(item => ({ id: item.operator_name, operator_name: item.operator_name }));
        } else {
            console.warn("[fetchOperators] RPC 'get_distinct_operators' did not return an array as expected:", data);
        }

        processedOperators = processedOperators.filter(op => op && typeof op.operator_name === 'string' && op.operator_name.trim() !== '');

        return {
            data: processedOperators,
            error: null
        };
    } catch (error) {
        console.error('Error fetching operators via RPC get_distinct_operators:', error);
        return { data: [], error };
    }
}

export async function fetchUfRegions() {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase
            .from('regions')
            .select('uf, region_name')
            .order('uf');
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Error fetching UF regions:', error);
        return { data: [], error };
    }
}