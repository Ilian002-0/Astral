// FIX: Re-implemented the entire LanguageContext to resolve malformed file and missing exports issue.
import React, { createContext, useContext, ReactNode, useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

// Define a type for our translation dictionary
type Translations = { [key: string]: any };

type Language = 'en' | 'fr';

const enTranslations: Translations = {
  "nav": { "trades": "List of Trades", "calendar": "Calendar", "dashboard": "Dashboard", "profile": "Profile", "analysis": "Analysis", "goals": "Goals" },
  "common": { "currency": "${{value}}", "currency_plus": "+${{value}}", "currency_minus": "-${{value}}", "percentage": "{{value}}%", "close": "Close", "cancel": "Cancel", "save": "Save", "error": "Error", "today": "Today", "share": "Share" },
  "errors": { "fetch_failed": "Could not fetch the data. This might be a network issue or a CORS problem. Please ensure the URL is a direct, public link to a CSV file (e.g., from Google Sheets 'Publish to the web').", "offline": "You are not connected to the network. The data shown may not be up to date." },
  "app": { "welcome": "Welcome!", "add_account_prompt": "Please add an account to visualize your trading data.", "add_first_account_button": "Add Your First Account" },
  "header": { "last_update": "Last update", "seconds_ago": "a few seconds ago", "profit_today": "Today's Profit", "profit_yesterday": "Yesterday's Profit", "profit_x_days_ago": "Result {{count}} days ago", "sync_now": "Sync Now", "syncing": "Syncing...", "today_total_pnl": "Today's Total P/L", "floating_pnl": "Floating P/L" },
  "dashboard": { "balance_chart_title": "Equity Curve", "advanced_analysis": "Advanced Analysis", "chart_no_data": "Not enough data to display the chart for the selected period.", "daily_results_table_title": "Daily Results", "date": "Date", "result": "Result", "total_result": "Total result", "recent_trades_table_title": "Last trades", "id": "ID", "dates": "Dates", "type": "Type", "symbol": "Symbol", "size": "Size", "winning_trades": "Winning Trades", "losing_trades": "Losing Trades", "time_range": { "today": "Today", "week": "Last 7 Days", "month": "Last 30 Days", "all": "All Time" } },
  "metrics": { "total_profit": "Net Profit (Closed)", "floating_pnl": "Floating P/L", "profit_factor": "Profit factor", "max_drawdown": "Max drawdown", "total_balance": "Total balance", "total_deposits": "Total deposits", "average_win": "Average win", "average_loss": "Average loss", "win_rate": "Win rate", "total_orders": "Total closed trades", "float": "Float", "orders": "{{count}} orders" },
  "open_trades": { "title": "Open Trades", "total_floating_pnl": "Total Floating P/L" },
  "trades_list": { "title": "All Closed Trades ({{count}})", "search_placeholder": "Search trades...", "customize_columns": "Customize Columns", "no_trades_found": "No trades found.", "col_id": "ID", "col_open_time": "Open Time", "col_type": "Type", "col_size": "Size", "col_symbol": "Symbol", "col_open_price": "Open Price", "col_close_time": "Close Time", "col_close_price": "Close Price", "col_commission": "Commission", "col_swap": "Swap", "col_profit": "Profit", "col_comment": "Comment" },
  "calendar": { "title": "Daily Summary", "weekly_summary": "Weekly Summary", "week": "Week {{number}}", "pnl": "PnL: {{value}}", "no_trades": "No trades", "mon": "Mon", "tue": "Tue", "wed": "Wed", "thu": "Thu", "fri": "Fri", "sat": "Sat", "sun": "Sun", "trade": "trade", "trades": "trades", "day": "day", "days": "days", "monthly_total": "Monthly Total" },
  "day_modal": { "title": "Trades for {{date}}", "net_profit": "Net Profit", "total_lot_size": "Total Lot Size", "daily_return": "Daily Return %", "symbol": "Symbol", "type": "Type", "size": "Size", "profit": "Profit" },
  "account_action_modal": { "title": "Account Actions", "subtitle": "What would you like to do?", "add_new": "Add a New Account", "update_current": "Update Current Account", "delete_current": "Delete Current Account" },
  "add_account_modal": { "title": "Add New Account", "title_update": "Update Account", "subtitle": "Provide account details and upload the trade history CSV.", "subtitle_update": "Update account details and upload new trades.", "account_name": "Account Name", "account_name_placeholder": "e.g., My Main Account", "initial_balance": "Initial Balance ({{currency}})", "initial_balance_placeholder": "e.g., 100000", "file_loaded": "File loaded:", "trades_found": "{{count}} trades found.", "trades_to_add": "{{count}} new trades will be added.", "trades_updated": "{{count}} existing trades will be updated.", "clear_file": "Clear file", "save_button": "Save Account", "save_button_update": "Update Account", "data_source": "Data Source", "file_upload": "File Upload", "live_url": "Live Data URL", "csv_url": "Live Data URL", "csv_url_placeholder": "e.g., Published Google Sheet or direct CSV link", "url_helper_text": "For Google Sheets: Go to File > Share > Publish to web, select 'Comma-separated values (.csv)', and copy the generated link." },
  "delete_confirmation": { "title": "Confirm Deletion", "message": "Are you sure you want to delete the account '{{accountName}}'? This action cannot be undone.", "confirm_button": "Yes, Delete" },
  "file_upload": { "title": "Upload Your MT5 Trade History", "subtitle": "Drag & drop your CSV file here, or click to select a file.", "drop_prompt": "Drop it like it's hot!", "click_prompt": "Click or Drag File Here" },
  "profile": { "title": "Profile & Settings", "language": "Language", "english": "English", "french": "French", "backup_title": "Data Backup", "backup_description": "Connect your Google account to back up all your accounts, trades, and settings to Google Drive.", "connect_google": "Connect Google Account", "backup_button": "Backup to Google Drive", "backup_loading": "Backing up...", "backup_success": "Backup Successful!", "backup_retry": "Retry Backup", "backup_no_client_id": "Google Client ID is not configured. Backup is unavailable.", "feature_coming_soon": "Functionality coming soon.", "free_to_use": "Atlas is free to use.", "data_privacy": "Your data is stored locally on your device.", "update_title": "Application Update", "update_description": "Force the application to check for the latest version.", "update_button": "Check for Updates", "custom_logo_title": "Custom Logo", "custom_logo_description": "Use a public URL to set your own logo. Caching with the service worker is enabled.", "custom_logo_placeholder": "https://example.com/logo.png", "reset_logo_button": "Reset to Default Logo" },
  "analysis": { "title": "Advanced Analysis", "filter_symbols_title": "Filter by Symbol", "filter_symbols_placeholder": "All Symbols", "filter_comments_title": "Filter by Comment", "filter_comments_placeholder": "All Comments", "select_all": "Select All", "clear_all": "Clear All", "filtered_trades_title": "Filtered Trades", "filtered_profit_title": "Filtered Net Profit", "back_to_dashboard": "Back to Dashboard", "item_name_symbols": "symbols", "item_name_comments": "comments", "start_date": "Start Date", "end_date": "End Date" },
  "goals": { "title": "Trading Goals", "subtitle": "Set your targets and track your progress.", "edit_goals": "Edit Goals", "save_goals": "Save Goals", "cancel": "Cancel", "metric_netProfit": "Net Profit ($)", "metric_winRate": "Win Rate (%)", "metric_profitFactor": "Profit Factor", "metric_maxDrawdown": "Max Drawdown (%)", "current": "Current", "target": "Target", "not_set": "Not Set", "enable_goal": "Enable Goal", "goal_met": "Goal Met!", "less_is_better": "lower is better", "show_on_chart": "Show on chart", "profit_target_label": "Profit Target", "drawdown_target_label": "Drawdown Limit" },
  "benchmark": { "title": "Performance vs. Benchmark (SPY)", "your_return": "Your Return", "spy_return": "SPY Return", "outperformance": "Outperformance", "your_performance": "Your Performance", "spy_performance": "SPY Performance" }
};

const frTranslations: Translations = {
  "nav": { "trades": "Liste des Trades", "calendar": "Calendrier", "dashboard": "Tableau de bord", "profile": "Profil", "analysis": "Analyse", "goals": "Objectifs" },
  "common": { "currency": "{{value}} $", "currency_plus": "+{{value}} $", "currency_minus": "-{{value}} $", "percentage": "{{value}} %", "close": "Fermer", "cancel": "Annuler", "save": "Enregistrer", "error": "Erreur", "today": "Aujourd'hui", "share": "Partager" },
  "errors": { "fetch_failed": "Impossible de récupérer les données. Il peut s'agir d'un problème de réseau ou de CORS. Veuillez vous assurer que l'URL est un lien public direct vers un fichier CSV (par exemple, depuis Google Sheets 'Publier sur le web').", "offline": "Vous n'êtes pas connecté au réseau. Les données affichées могут ne pas être à jour." },
  "app": { "welcome": "Bienvenue !", "add_account_prompt": "Veuillez ajouter un compte pour visualiser vos données de trading.", "add_first_account_button": "Ajouter votre premier compte" },
  "header": { "last_update": "Dernière mise à jour", "seconds_ago": "il y a quelques secondes", "profit_today": "Profit d'aujourd'hui", "profit_yesterday": "Profit d'hier", "profit_x_days_ago": "Résultat il y a {{count}} jours", "sync_now": "Synchroniser", "syncing": "Synchronisation...", "today_total_pnl": "P/L Total du Jour", "floating_pnl": "P/L Flottant" },
  "dashboard": { "balance_chart_title": "Courbe de capitaux propres", "advanced_analysis": "Analyse Avancée", "chart_no_data": "Pas assez de données pour afficher le graphique pour la période sélectionnée.", "daily_results_table_title": "Résultats journaliers", "date": "Date", "result": "Résultat", "total_result": "Résultat total", "recent_trades_table_title": "Derniers trades", "id": "ID", "dates": "Dates", "type": "Type", "symbol": "Symbole", "size": "Taille", "winning_trades": "Trades Gagnants", "losing_trades": "Trades Perdants", "time_range": { "today": "Aujourd'hui", "week": "7 derniers jours", "month": "30 derniers jours", "all": "Toute la période" } },
  "metrics": { "total_profit": "Profit Net (Clôturé)", "floating_pnl": "P/L Flottant", "profit_factor": "Facteur de profit", "max_drawdown": "Drawdown max", "total_balance": "Solde total", "total_deposits": "Dépôts totaux", "average_win": "Gain moyen", "average_loss": "Perte moyenne", "win_rate": "Taux de réussite", "total_orders": "Trades clôturés totaux", "float": "Flottant", "orders": "{{count}} ordres" },
  "open_trades": { "title": "Trades Ouverts", "total_floating_pnl": "P/L Flottant Total" },
  "trades_list": { "title": "Tous les Trades Clôturés ({{count}})", "search_placeholder": "Rechercher des trades...", "customize_columns": "Personnaliser les colonnes", "no_trades_found": "Aucun trade trouvé.", "col_id": "ID", "col_open_time": "Heure d'ouverture", "col_type": "Type", "col_size": "Taille", "col_symbol": "Symbole", "col_open_price": "Prix d'ouverture", "col_close_time": "Heure de fermeture", "col_close_price": "Prix de fermeture", "col_commission": "Commission", "col_swap": "Swap", "col_profit": "Profit", "col_comment": "Commentaire" },
  "calendar": { "title": "Résumé journalier", "weekly_summary": "Résumé hebdomadaire", "week": "Semaine {{number}}", "pnl": "PnL: {{value}}", "no_trades": "Aucun trade", "mon": "Lu", "tue": "Ma", "wed": "Me", "thu": "Je", "fri": "Ve", "sat": "Sa", "sun": "Di", "trade": "trade", "trades": "trades", "day": "jour", "days": "jours", "monthly_total": "Total Mensuel" },
  "day_modal": { "title": "Trades pour le {{date}}", "net_profit": "Profit Net", "total_lot_size": "Taille Totale du Lot", "daily_return": "Rendement Journalier %", "symbol": "Symbole", "type": "Type", "size": "Taille", "profit": "Profit" },
  "account_action_modal": { "title": "Actions de Compte", "subtitle": "Que souhaitez-vous faire ?", "add_new": "Ajouter un nouveau compte", "update_current": "Mettre à jour le compte actuel", "delete_current": "Supprimer le Compte Actuel" },
  "add_account_modal": { "title": "Ajouter un nouveau compte", "title_update": "Mettre à jour le Compte", "subtitle": "Fournissez les détails du compte et téléchargez le CSV de l'historique des trades.", "subtitle_update": "Mettez à jour les détails du compte et téléchargez de nouveaux trades.", "account_name": "Nom du compte", "account_name_placeholder": "ex: Mon compte principal", "initial_balance": "Solde initial ({{currency}})", "initial_balance_placeholder": "ex: 100000", "file_loaded": "Fichier chargé :", "trades_found": "{{count}} trades trouvés.", "trades_to_add": "{{count}} nouveaux trades seront ajoutés.", "trades_updated": "{{count}} trades existants seront mis à jour.", "clear_file": "Retirer le fichier", "save_button": "Enregistrer le compte", "save_button_update": "Mettre à jour le Compte", "data_source": "Source de Données", "file_upload": "Fichier Local", "live_url": "URL Active", "csv_url": "URL des Données en Direct", "csv_url_placeholder": "ex: Lien Google Sheet publié ou CSV direct", "url_helper_text": "Pour Google Sheets : Allez dans Fichier > Partager > Publier sur le web, sélectionnez 'Valeurs séparées par des virgules (.csv)', et copiez le lien généré." },
  "delete_confirmation": { "title": "Confirmer la Suppression", "message": "Êtes-vous sûr de vouloir supprimer le compte '{{accountName}}' ? Cette action est irréversible.", "confirm_button": "Oui, Supprimer" },
  "file_upload": { "title": "Téléchargez votre historique de trading MT5", "subtitle": "Glissez-déposez votre fichier CSV ici, ou cliquez pour sélectionner un fichier.", "drop_prompt": "Lâchez-le ici !", "click_prompt": "Cliquez ou glissez un fichier ici" },
  "profile": { "title": "Profil & Paramètres", "language": "Langue", "english": "Anglais", "french": "Français", "backup_title": "Sauvegarde des Données", "backup_description": "Connectez votre compte Google pour sauvegarder tous vos comptes, trades et paramètres sur Google Drive.", "connect_google": "Connecter le Compte Google", "backup_button": "Sauvegarder sur Google Drive", "backup_loading": "Sauvegarde en cours...", "backup_success": "Sauvegarde Réussie !", "backup_retry": "Réessayer la Sauvegarde", "backup_no_client_id": "L'ID client Google n'est pas configuré. La sauvegarde est indisponible.", "feature_coming_soon": "Fonctionnalité à venir.", "free_to_use": "Atlas est gratuit.", "data_privacy": "Vos données sont stockées localement sur votre appareil.", "update_title": "Mise à jour de l'application", "update_description": "Forcer l'application à rechercher la dernière version.", "update_button": "Vérifier les mises à jour", "custom_logo_title": "Logo Personnalisé", "custom_logo_description": "Utilisez une URL publique pour définir votre propre logo. La mise en cache avec le service worker est activée.", "custom_logo_placeholder": "https://exemple.com/logo.png", "reset_logo_button": "Réinitialiser le logo par défaut" },
  "analysis": { "title": "Analyse Avancée", "filter_symbols_title": "Filtrer par Symbole", "filter_symbols_placeholder": "Tous les symboles", "filter_comments_title": "Filtrer par Commentaire", "filter_comments_placeholder": "Tous les commentaires", "select_all": "Tout sélectionner", "clear_all": "Tout effacer", "filtered_trades_title": "Trades Filtrés", "filtered_profit_title": "Profit Net Filtré", "back_to_dashboard": "Retour au Tableau de Bord", "item_name_symbols": "symboles", "item_name_comments": "commentaires", "start_date": "Date de début", "end_date": "Date de fin" },
    "goals": {
    "title": "Objectifs de Trading",
    "subtitle": "Définissez vos cibles et suivez vos progrès.",
    "edit_goals": "Modifier les Objectifs",
    "save_goals": "Enregistrer les Objectifs",
    "cancel": "Annuler",
    "metric_netProfit": "Profit Net ($)",
    "metric_winRate": "Taux de Réussite (%)",
    "metric_profitFactor": "Facteur de Profit",
    "metric_maxDrawdown": "Drawdown Max (%)",
    "current": "Actuel",
    "target": "Cible",
    "not_set": "Non défini",
    "enable_goal": "Activer l'objectif",
    "goal_met": "Objectif atteint !",
    "less_is_better": "plus bas c'est mieux",
    "show_on_chart": "Afficher sur le graphique",
    "profit_target_label": "Objectif de Profit",
    "drawdown_target_label": "Limite de Drawdown"
  },
  "benchmark": {
    "title": "Performance vs. Indice (SPY)",
    "your_return": "Votre Rendement",
    "spy_return": "Rendement SPY",
    "outperformance": "Surperformance",
    "your_performance": "Votre Performance",
    "spy_performance": "Performance SPY"
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language | 'en' | 'fr') => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const translations: Record<Language, Translations> = {
    en: enTranslations,
    fr: frTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<Language>('language', 'en');

  const t = (key: string, options?: { [key: string]: string | number }) => {
    const keyParts = key.split('.');
    let translation: any = translations[language] || translations['en'];

    for (const part of keyParts) {
      if (translation && typeof translation === 'object' && translation[part] !== undefined) {
        translation = translation[part];
      } else {
        // Fallback to English if key not found in current language
        let fallbackTranslation = translations['en'];
        let found = true;
        for (const enPart of keyParts) {
            if (fallbackTranslation && typeof fallbackTranslation === 'object' && fallbackTranslation[enPart] !== undefined) {
                fallbackTranslation = fallbackTranslation[enPart];
            } else {
                found = false;
                break;
            }
        }
        if (found) {
            translation = fallbackTranslation;
        } else {
            return key; // Return key if not found in English either
        }
        break;
      }
    }

    if (typeof translation === 'string' && options) {
      return Object.entries(options).reduce((str, [optKey, optValue]) => {
        return str.replace(new RegExp(`{{${optKey}}}`, 'g'), String(optValue));
      }, translation);
    }
    
    return typeof translation === 'string' ? translation : key;
  };

  const value = { language, setLanguage, t };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};