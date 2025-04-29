import { createClient } from '@supabase/supabase-js';

let supabaseClientInstance = null;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getSupabaseClient() {
    if (supabaseClientInstance) {
        return supabaseClientInstance;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Supabase URL or ANON KEY not provided.");
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
        console.error("Error creating Supabase client:", error);
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
        console.warn("[supabaseClient] insertCallRecords: Nenhum registro fornecido para inserção.");
        return { data: null, error: new Error("Nenhum registro fornecido") };
    }
    console.log("[supabaseClient] insertCallRecords: Tentando inserir registros...", records.length);


    const supabase = getSupabaseClient();

    let userId = null;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userId = user.id;
        }
    } catch (authError) {
        console.warn("[supabaseClient] insertCallRecords: Erro ao obter usuário autenticado, uploaded_by será NULL.");
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

        console.log("[supabaseClient] insertCallRecords: Inserção concluída.", data.length, "registros.");
        return { data, error: null };
    } catch (error) {
        console.error("[supabaseClient] insertCallRecords: Erro na inserção:", error);
        return { data: null, error };
    }
}


function getDateRangeParams(dateRange) {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let current_start_date;
    let current_end_date = new Date(now);

    let previous_start_date;
    let previous_end_date;

    switch (dateRange) {
        case 'today':
            current_start_date = new Date(today);
            current_end_date = new Date(today);
            current_end_date.setHours(23, 59, 59, 999);
            previous_start_date = new Date(today);
            previous_start_date.setDate(today.getDate() - 1);
            previous_end_date = new Date(previous_start_date);
            previous_end_date.setHours(23, 59, 59, 999);
            break;
        case 'yesterday':
             const yesterday = new Date(today);
             yesterday.setDate(today.getDate() - 1);
             current_start_date = new Date(yesterday);
             current_end_date = new Date(yesterday);
             current_end_date.setHours(23, 59, 59, 999);
             previous_start_date = new Date(yesterday);
             previous_start_date.setDate(yesterday.getDate() - 1);
             previous_end_date = new Date(previous_start_date);
             previous_end_date.setHours(23, 59, 59, 999);
            break;
        case 'week':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - 6);
            current_start_date = new Date(startOfWeek);
            current_end_date = new Date(today);
            current_end_date.setHours(23, 59, 59, 999);
            previous_start_date = new Date(startOfWeek);
            previous_start_date.setDate(startOfWeek.getDate() - 7);
            previous_end_date = new Date(startOfWeek);
            previous_end_date.setDate(startOfWeek.getDate() - 1);
            previous_end_date.setHours(23, 59, 59, 999);
            break;
        case 'month':
            const startOfMonth = new Date(today);
            startOfMonth.setDate(today.getDate() - 29);
            current_start_date = new Date(startOfMonth);
            current_end_date = new Date(today);
            current_end_date.setHours(23, 59, 59, 999);
             previous_start_date = new Date(startOfMonth);
             previous_start_date.setDate(startOfMonth.getDate() - 30);
             previous_end_date = new Date(startOfMonth);
             previous_end_date.setDate(startOfMonth.getDate() - 1);
             previous_end_date.setHours(23, 59, 59, 999);
            break;
        default:
            current_start_date = null;
            current_end_date = null;
            previous_start_date = null;
            previous_end_date = null;
    }

    return {
        current_start_date: current_start_date ? current_start_date.toISOString() : null,
        current_end_date: current_end_date ? current_end_date.toISOString() : null,
        previous_start_date: previous_start_date ? previous_start_date.toISOString() : null,
        previous_end_date: previous_end_date ? previous_end_date.toISOString() : null,
    };
}


export async function fetchDashboardMetricsWithTrend(filters) {
    const supabase = getSupabaseClient();
    console.log("[supabaseClient] fetchDashboardMetricsWithTrend received filters:", filters);

    // Revert to using supabase.rpc directly
    const { data: current, error: currentError } = await supabase.rpc('get_dashboard_metrics', {
        start_date: filters.currentFilters.start_date,
        end_date: filters.currentFilters.end_date,
        filter_state: filters.currentFilters.filter_state,
        filter_operator_name: filters.currentFilters.filter_operator_name,
        filter_region: filters.currentFilters.filter_region,
    });

    const { data: previous, error: previousError } = await supabase.rpc('get_dashboard_metrics', {
        start_date: filters.previousFilters.start_date,
        end_date: filters.previousFilters.end_date,
        filter_state: filters.previousFilters.filter_state,
        filter_operator_name: filters.previousFilters.filter_operator_name,
        filter_region: filters.previousFilters.filter_region,
    });


    if (currentError) console.error("[supabaseClient] fetchDashboardMetricsWithTrend error fetching current period:", currentError);
    if (previousError) console.error("[supabaseClient] fetchDashboardMetricsWithTrend error fetching previous period:", previousError);


    // Return the structure expected by dataUtils.getPerformanceMetrics
    return {
        data: current ? current[0] : null, // get_dashboard_metrics returns an array with one object
        previous: previous ? previous[0] : null, // get_dashboard_metrics returns an array with one object
        error: currentError || previousError, // Return any error
    };
}

export async function fetchStatusDistribution(filters) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_status_distribution', {
        start_date: filters.start_date,
        end_date: filters.end_date,
        filter_state: filters.filter_state,
        filter_operator_name: filters.filter_operator_name,
        filter_region: filters.filter_region,
    });

    if (error) console.error("[supabaseClient] fetchStatusDistribution RPC error:", error);
    return { data, error };
}

export async function fetchHourlyCallCounts(filters) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_hourly_call_counts', {
        start_date: filters.start_date,
        end_date: filters.end_date,
        filter_state: filters.filter_state,
        filter_operator_name: filters.filter_operator_name,
        filter_region: filters.filter_region,
    });

    if (error) console.error("[supabaseClient] fetchHourlyCallCounts RPC error:", error);
    return { data, error };
}

export async function fetchTabulationDistribution(filters) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_tabulation_distribution', {
        start_date: filters.start_date,
        end_date: filters.end_date,
        filter_state: filters.filter_state,
        filter_operator_name: filters.filter_operator_name,
        filter_region: filters.filter_region,
    });

    if (error) console.error("[supabaseClient] fetchTabulationDistribution RPC error:", error);
    return { data, error };
}

export async function fetchStateMapData(filters) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_state_map_data', {
        start_date: filters.start_date,
        end_date: filters.end_date,
        filter_operator_name: filters.filter_operator_name,
        filter_region: filters.filter_region,
    });

    if (error) console.error("[supabaseClient] fetchStateMapData RPC error:", error);
    return { data, error };
}

export async function fetchOperators() {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase.rpc('get_distinct_operators');
        if (error) throw error;
        // Map operator_name to id for consistency with selectedOperatorId state
        const operators = data ? data.map(op => ({ ...op, id: op.operator_name })) : [];
        return { data: operators, error: null };
    } catch (error) {
        console.error("[supabaseClient] fetchOperators RPC error:", error);
        return { data: [], error };
    }
}

export async function fetchStates() {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase.rpc('get_distinct_states');
        if (error) throw error;
        const states = data ? data.map(item => item.uf) : [];
        return { data: states, error: null };
    } catch (error) {
        console.error("[supabaseClient] fetchStates RPC error:", error);
        return { data: [], error };
    }
}

// New fetch function for regions
export async function fetchRegions() {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase.rpc('get_distinct_regions'); // Call the new RPC
        if (error) throw error;
        const regions = data ? data.map(item => item.region_name) : []; // Map to array of region names
        return { data: regions, error: null };
    } catch (error) {
        console.error("[supabaseClient] fetchRegions RPC error:", error);
        return { data: [], error };
    }
}