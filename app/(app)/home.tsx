import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { createTodo, deleteTodo, getTodos, logout, updateTodo } from "../../lib/api";

type Todo = { id: number; title: string; completed: boolean };

export default function HomeScreen() {
    const router = useRouter();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [loading, setLoading] = useState(false);

    // ── Handle session expired → redirect to login ────────────────────────────
    function handleError(e: any) {
        if (e.message === "SESSION_EXPIRED") {
            router.replace("/(auth)/login");
        } else {
            Alert.alert("Error", e.message);
        }
    }

    // ── Fetch todos ───────────────────────────────────────────────────────────
    const fetchTodos = useCallback(async () => {
        try {
            const data = await getTodos();
            setTodos(data);
        } catch (e: any) {
            handleError(e);
        }
    }, []);

    useEffect(() => { fetchTodos(); }, []);

    // ── CREATE ────────────────────────────────────────────────────────────────
    async function handleCreate() {
        if (!newTitle.trim()) return;
        try {
            setLoading(true);
            await createTodo(newTitle);
            setNewTitle("");
            fetchTodos();
        } catch (e: any) {
            handleError(e);
        } finally {
            setLoading(false);
        }
    }

    // ── TOGGLE complete ───────────────────────────────────────────────────────
    async function handleToggle(todo: Todo) {
        try {
            await updateTodo(todo.id, { completed: !todo.completed });
            fetchTodos();
        } catch (e: any) {
            handleError(e);
        }
    }

    // ── UPDATE title ──────────────────────────────────────────────────────────
    async function handleUpdate(id: number) {
        if (!editTitle.trim()) return;
        try {
            await updateTodo(id, { title: editTitle });
            setEditingId(null);
            fetchTodos();
        } catch (e: any) {
            handleError(e);
        }
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    async function handleDelete(id: number) {
        Alert.alert(
            "Delete Todo",
            "Are you sure you want to delete this todo?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteTodo(id);
                            fetchTodos();
                        } catch (e: any) {
                            handleError(e);
                        }
                    }
                }
            ]
        );
    }

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    async function handleLogout() {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await logout();
                            router.replace("/(auth)/login");
                        } catch (e: any) {
                            handleError(e);
                        }
                    }
                }
            ]
        );
    }

    const completedCount = todos.filter(t => t.completed).length;
    const pendingCount = todos.length - completedCount;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>My Tasks</Text>
                        <Text style={styles.subtitle}>
                            {pendingCount} pending · {completedCount} completed
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                {/* Create Todo Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="What needs to be done?"
                        placeholderTextColor="#9ca3af"
                        value={newTitle}
                        onChangeText={setNewTitle}
                        onSubmitEditing={handleCreate}
                        editable={!loading}
                    />
                    <TouchableOpacity
                        style={[styles.addButton, loading && styles.addButtonDisabled]}
                        onPress={handleCreate}
                        disabled={loading || !newTitle.trim()}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                            <Ionicons name="add" size={24} color="#ffffff" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Todo List */}
                <FlatList
                    data={todos}
                    keyExtractor={(item) => item.id.toString()}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="checkmark-done-circle-outline" size={64} color="#d1d5db" />
                            <Text style={styles.emptyText}>No tasks yet</Text>
                            <Text style={styles.emptySubtext}>Add your first todo above</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.todoItem}>
                            {editingId === item.id ? (
                                // Edit mode
                                <View style={styles.editContainer}>
                                    <TextInput
                                        style={styles.editInput}
                                        value={editTitle}
                                        onChangeText={setEditTitle}
                                        autoFocus
                                        onSubmitEditing={() => handleUpdate(item.id)}
                                    />
                                    <View style={styles.editActions}>
                                        <TouchableOpacity
                                            style={styles.saveButton}
                                            onPress={() => handleUpdate(item.id)}
                                        >
                                            <Ionicons name="checkmark" size={20} color="#ffffff" />
                                            <Text style={styles.saveButtonText}>Save</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => setEditingId(null)}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                // View mode
                                <View style={styles.todoContent}>
                                    <TouchableOpacity
                                        style={styles.checkbox}
                                        onPress={() => handleToggle(item)}
                                    >
                                        <Ionicons
                                            name={item.completed ? "checkbox" : "square-outline"}
                                            size={24}
                                            color={item.completed ? "#10b981" : "#6b7280"}
                                        />
                                    </TouchableOpacity>

                                    <Text style={[
                                        styles.todoTitle,
                                        item.completed && styles.todoTitleCompleted
                                    ]}>
                                        {item.title}
                                    </Text>

                                    <View style={styles.todoActions}>
                                        <TouchableOpacity
                                            style={styles.editAction}
                                            onPress={() => {
                                                setEditingId(item.id);
                                                setEditTitle(item.title);
                                            }}
                                        >
                                            <Ionicons name="pencil" size={18} color="#3b82f6" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteAction}
                                            onPress={() => handleDelete(item.id)}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    logoutButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#fef2f2',
    },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 12,
    },
    input: {
        flex: 1,
        height: 48,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111827',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    addButton: {
        width: 48,
        height: 48,
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    listContent: {
        paddingVertical: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
    },
    todoItem: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    todoContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    checkbox: {
        padding: 2,
    },
    todoTitle: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    todoTitleCompleted: {
        textDecorationLine: 'line-through',
        color: '#9ca3af',
    },
    todoActions: {
        flexDirection: 'row',
        gap: 16,
    },
    editAction: {
        padding: 6,
    },
    deleteAction: {
        padding: 6,
    },
    editContainer: {
        padding: 16,
        gap: 12,
    },
    editInput: {
        height: 48,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    editActions: {
        flexDirection: 'row',
        gap: 12,
    },
    saveButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#10b981',
        paddingVertical: 10,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    saveButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        paddingVertical: 10,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#6b7280',
        fontWeight: '600',
        fontSize: 14,
    },
});