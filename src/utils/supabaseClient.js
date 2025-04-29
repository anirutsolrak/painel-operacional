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

    return {
        data: current ? current[0] : null,
        previous: previous ? previous[0] : null,
        error: currentError || previousError,
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

    return { data, error };
}

export async function fetchOperators() {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase.rpc('get_distinct_operators');
        if (error) throw error;
        const operators = data ? data.map(op => ({ ...op, id: op.operator_name })) : [];
        return { data: operators, error: null };
    } catch (error) {
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
        return { data: [], error };
    }
}

export async function fetchRegions() {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase.rpc('get_distinct_regions');
        if (error) throw error;
        const regions = data ? data.map(item => item.region_name) : [];
        return { data: regions, error: null };
    } catch (error) {
        return { data: [], error };
    }
}