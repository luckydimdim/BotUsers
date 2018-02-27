'use strict';

/**
 * Конструктор объекта загрузки пользователей
 *
 * @param {string} inputSelector
 * @param {string} tableSelector
 * @param {string} template
 * @param {Object=} options
 * @constructor
 */
function BotUsers(inputSelector, tableSelector, template, options) {
    var that = this;

    // Дефолтовые настройки
    this.settings = {
        "preloaderSelector": '.js-input-preloader, .js-table-preloader'
    };
    $.extend(this.settings, options || {});


    this.$input = $(inputSelector); // Строка поиска
    this.$table = $(tableSelector); // Таблица с результатами
    this.template = template;       // LoDash шаблон

    this.$preloader = $(this.settings.preloaderSelector);
    this.oldInputValue = '';

    // Объект для блокировки повторных запросов к API
    this.syncObject = {
        "status": 'ready'
    };

    // Инициализация вотчера за строкой поиска
    // (способ избавления от кнопки поиска)
    setInterval(function() {
        that.watchInputChanges.call(that);
    }, 200);

    // Инициализация вотчера за проскроленностью страницы
    // для своевременной подгрузки следующей страницы
    setInterval(function() {
        that.watchScrollChanges.call(that);
    }, 200);
};

/**
 * Объект загрузки пользователей
 */
BotUsers.prototype = {
    constructor: BotUsers,

    /**
     * Следит за изменениями содержимого строки ввода.
     *
     * Когда содержимое изменилось:
     * - делает запрос к API
     * - очищает таблицу от старых данных
     * - вставляет в таблицу свежеполученные данные
     */
    watchInputChanges: function() {
        var that = this,
            inputValue = this.$input.val();

        // Если данные в строке ввода не изменились, то новый запрос к API не инициируем
        if (this.syncObject.status !== 'ready' || inputValue == this.oldInputValue)
            return;

        // Запоминаем текущее значение на будующее
        this.oldInputValue = inputValue;

        // Получение параметров для запроса
        var requestParams = this.prepareRequestParams();

        this.getUsers(requestParams).done(function(data) {
            that.clearTable();

            if (data.result.length > 0) {
                that.addUsersToTable(data.result);
            }
        });
    },

    /**
     * Подготавливает параметры для запроса к API.
     *
     * При расширении поиска на другие атрибуты пользователя
     * метод необходимо будет модифицировать.
     *
     * @returns {Object}
     */
    prepareRequestParams: function() {
        var name = this.$input.val(),
            result = {};

        result = { 'searchTerm': name };

        return result;
    },

    /**
     * Следит за изменениями проскроленности страницы.
     *
     * Когда страница проскролилась до самого низа:
     * - делает запрос к API
     * - добавляет в таблицу свежеполученные данные к имеющимся данным
     */
    watchScrollChanges: function() {
        var that = this,
            inputValue = this.$input.val();

        // При пустой строке запроса или если предыдущий запрос к
        // API еще не завершился, то новое обращение к API не инициируем
        if (this.syncObject.status !== 'ready' || inputValue === '')
            return;

        var scrollHeight = $(document).height(),
            scrollPosition = $(window).height() + $(window).scrollTop();

        // Получение параметров для запроса
        var requestParams = this.prepareRequestParams();

        if ( (scrollHeight - scrollPosition) / scrollHeight === 0 ) {
            this.getUsers(requestParams).done(function(data) {

                if (data.result.length > 0) {
                    that.addUsersToTable(data.result);
                }
            });
        }
    },

    /**
     * Выполняет обращение к API.
     *
     * @param {Object} requestParams Параметры поиска для передачи в API
     * @returns {Object} result Возвраащет промис
     *
     * TODO: сделать обработку смены страниц.
     */
    getUsers: function(requestParams) {
        var that = this;

        var result = $.ajax({
            method: 'GET',
            url: '/api/users',
            data: requestParams,
            beforeSend: function() {
                that.syncObject.status = 'inProgress';
                that.showPreloader();
            }
        }).always(function() {
            that.hidePreloader();
            that.syncObject.status = 'ready';
        }).fail(function(jqXHR, exception) {
            console.log(exception);
        });

        return result;
    },

    /**
     * Очищает таблицу от пользователей.
     */
    clearTable: function() {
        this.$table.find('tbody').empty();
    },

    /**
     * Добавляет пользователей в таблицу.
     *
     * @param {Object} tableData
     */
    addUsersToTable: function(tableData) {
        var template = _.template(this.template);
        var compiledTemplate = template({users: tableData});

        this.$table.find('tbody:last').append(compiledTemplate);
    },

    /**
     * Показывает прелоадер
     */
    showPreloader: function() {
        this.$preloader.show();
    },

    /**
     * Скрывает прелоадер
     */
    hidePreloader: function() {
        this.$preloader.hide();
    }
};

/**
 * Запуск приложения.
 */
$(function() {
    var input = '.js-search-input',
        table = '.js-table',
        template = $('.js-table-template').html();

    var botUsers = new BotUsers(input, table, template);
});