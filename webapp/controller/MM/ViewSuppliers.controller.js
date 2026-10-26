sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/routing/History",
        "zcoffee/model/formatter",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast",
        "sap/m/MessageBox"
    ],
    (
        Controller,
        History,
        formatter,
        Filter,
        FilterOperator,
        JSONModel,
        MessageToast,
        MessageBox
    ) => {
        "use strict";

        // Campos do Dialog que passam por validação (e têm o ValueState resetado ao abrir)
        const VALIDATED_FIELD_IDS = ["inputSupplierName", "inputSupplierCNPJ", "inputSupplierEmail", "inputSupplierPhone"];

        // Formato básico: algo@algo.algo, sem espaços (a validação definitiva fica no backend)
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Status "Ativo": filtro padrão da lista e status inicial de um fornecedor novo
        const STATUS_ACTIVE = "A";

        return Controller.extend("zcoffee.controller.MM.ViewSuppliers", {
            formatter: formatter,

            onInit() {
                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("RouteSuppliers")
                    .attachPatternMatched(this._onRouteMatched, this);

                this._oCustomStatus = this.byId("mcb_status_sup");
                this._oSmartTableSuppliers = this.byId("SuppliersSmartTable");
                this._oSfbSuppliers = this.byId("SF_suppliers");

                this.getView().setModel(new JSONModel({ isEditMode: false, dialogTitle: "", confirmMessage: "" }), "supDialogSettings");
                this.getView().setModel(new JSONModel({}), "suppliersData");
            },

            _onRouteMatched: function () {
                const sDirection = History.getInstance().getDirection();

                if (sDirection === "Backwards") {
                    this._oSmartTableSuppliers.rebindTable();
                }
            },

            onNavBack: function () {
                const sPreviousHash = History.getInstance().getPreviousHash();

                if (sPreviousHash) {
                    window.history.go(-1);
                } else {
                    this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
                }
            },

            onBeforeRebindTable: function (oEvent) {
                const aStatus = this._oCustomStatus.getSelectedKeys();
                const oBindingParams = oEvent.getParameter("bindingParams");

                if (aStatus.length > 0) {
                    const aFilterStatus = aStatus.map((sKey) => new Filter("Status", FilterOperator.EQ, sKey));
                    const oMultiStatusFilter = new Filter({ filters: aFilterStatus, and: false });

                    oBindingParams.filters.push(oMultiStatusFilter);
                }
            },

            onSmartFilterBarInitialise: function () {
                this._oCustomStatus.setSelectedKeys([STATUS_ACTIVE]);
            },

            onResetFilter: function () {
                this._oSfbSuppliers.clear();
                this._oCustomStatus.setSelectedKeys([STATUS_ACTIVE]);
                this._oSmartTableSuppliers.rebindTable();
            },

            onAdd: function () {
                this._setDialogMode(false);
                this._setInitialSuppliersData();
                this._resetValueStates();
                this._openDialog();
            },

            _getText: function (sKey, aArgs) {
                return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
            },

            _setDialogMode: function (bEditMode) {
                this.getView().getModel("supDialogSettings").setData({
                    isEditMode: bEditMode,
                    dialogTitle: this._getText(bEditMode ? "supplierDialogEditTitle" : "supplierDialogCreateTitle"),
                    confirmMessage: this._getText(bEditMode ? "supplierConfirmEdit" : "supplierConfirmCreate")
                });
            },

            _resetValueStates: function () {
                VALIDATED_FIELD_IDS.forEach((sId) => {
                    const oInput = this.byId(sId);

                    // Na primeira abertura o fragment ainda não foi carregado
                    if (oInput) {
                        oInput.setValueState("None");
                    }
                });
            },

            _openDialog: function () {
                // Guarda a Promise para carregar o fragment só na primeira abertura.
                // O loadFragment já usa o ID da View como prefixo, este controller e faz o addDependent.
                if (!this._pDialog) {
                    this._pDialog = this.loadFragment({
                        name: "zcoffee.view.fragments.DialogSuppliers"
                    });
                }

                this._pDialog.then((oDialog) => oDialog.open());
            },

            onCloseSupplierDialog: function () {
                this._pDialog.then((oDialog) => oDialog.close());
            },

            _setInitialSuppliersData: function () {
                this.getView().getModel("suppliersData").setData({ Status: STATUS_ACTIVE });
            },

            onSaveSupplier: function () {
                const bFormValid = this._validateSuppliersForm();

                if (!bFormValid) {
                    MessageToast.show(this._getText("fillRequiredFields"));
                    return;
                }

                MessageBox.confirm(this.getView().getModel("supDialogSettings").getProperty("/confirmMessage"), {
                    icon: MessageBox.Icon.QUESTION,
                    title: this._getText("confirmActionTitle"),
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    initialFocus: MessageBox.Action.CANCEL,
                    dependentOn: this.getView(),
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.OK) {
                            if(this.getView().getModel("supDialogSettings").getProperty("/isEditMode") === true){
                                //TODO
                            } else {
                                this._createSupplier(this._buildPayload());
                            }
                        } else if (sAction === MessageBox.Action.CANCEL) {
                            MessageToast.show(this._getText("actionCanceled"));
                        }
                    }
                });
            },

            _validateSuppliersForm: function () {
                const sName = this.byId("inputSupplierName").getValue().trim();
                const sCNPJ = this.byId("inputSupplierCNPJ").getValue().replace(/\D/g, "");
                const sEmail = this.byId("inputSupplierEmail").getValue().trim();
                const sPhone = this.byId("inputSupplierPhone").getValue().replace(/\D/g, "");

                // Array (e não &&) para que todos os campos sejam marcados, mesmo depois do primeiro erro.
                // Email e Telefone são opcionais: só valida se o usuário digitou algo
                const aResults = [
                    this._checkField("inputSupplierName", !!sName, "supplierNameError"),
                    this._checkField("inputSupplierCNPJ", sCNPJ.length === 14, "supplierCNPJError"),
                    this._checkField("inputSupplierEmail", !sEmail || EMAIL_REGEX.test(sEmail), "supplierEmailError"),
                    this._checkField("inputSupplierPhone", !sPhone || sPhone.length >= 10, "supplierPhoneError")
                ];

                return aResults.every(Boolean);
            },

            // Marca o campo como válido/inválido na tela e devolve o resultado da validação
            _checkField: function (sInputId, bValid, sErrorKey) {
                const oInput = this.byId(sInputId);

                oInput.setValueState(bValid ? "None" : "Error");
                oInput.setValueStateText(bValid ? "" : this._getText(sErrorKey));

                return bValid;
            },

            // Monta uma cópia dos dados para o backend, sem a máscara,
            // sem alterar o model que está ligado aos campos da tela
            _buildPayload: function () {
                const oData = this.getView().getModel("suppliersData").getData();

                return {
                    Nome: oData.Nome.trim(),
                    CNPJ: oData.CNPJ.replace(/\D/g, ""),
                    Email: oData.Email ? oData.Email.trim() : "",
                    Telefone: oData.Telefone ? oData.Telefone.replace(/\D/g, "") : "",
                    Status: oData.Status
                };
            },

            _createSupplier: function (oPayload) {
                const oModel = this.getView().getModel();

                this.getView().setBusy(true);

                oModel.create("/ZI_MM_FORNECEDOR", oPayload, {
                    success: (oDataNew) => {
                        this.getView().setBusy(false);
                        MessageBox.success(this._getText("supplierCreated", [oDataNew.IdForn]));

                        this.onCloseSupplierDialog();
                        this._oSmartTableSuppliers.rebindTable();
                    },

                    error: (oError) => {
                        this.getView().setBusy(false);
                        MessageBox.error(this._getErrorMessage(oError, this._getText("supplierCreateError")));
                    }
                });
            },

            // Lê a mensagem que o backend devolveu (ex.: "CNPJ já cadastrado").
            // Se a resposta não for o JSON padrão do OData (timeout, erro HTML do servidor), usa o texto padrão.
            _getErrorMessage: function (oError, sFallbackText) {
                try {
                    return JSON.parse(oError.responseText).error.message.value || sFallbackText;
                } catch (e) {
                    return sFallbackText;
                }
            },

            onPhoneLiveChange: function (oEvent) {
                const oInput = oEvent.getSource();
                let sValue = oEvent.getParameter("value").replace(/\D/g, "");

                // Máscara progressiva: o formato acompanha a quantidade de dígitos já digitados
                if (sValue.length > 10) {
                    // Formato Celular Completo: (11) 98888-7777
                    sValue = sValue.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
                } else if (sValue.length > 6) {
                    // Formato Intermediário/Fixo: (11) 8888-7777
                    sValue = sValue.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
                } else if (sValue.length > 2) {
                    // Formato Inicial: (11) 8888
                    sValue = sValue.replace(/^(\d{2})(\d{0,4})$/, "($1) $2");
                } else if (sValue.length > 0) {
                    // Apenas o DDD digitando: (11
                    sValue = sValue.replace(/^(\d{0,2})$/, "($1");
                }

                oInput.setValue(sValue);
            },

            onEdit: function (oEvent) {
                const sSupplierId = oEvent.getSource().getBindingContext().getProperty("IdForn");

                this._setDialogMode(true);
                this._resetValueStates();
                this._getSupplierData(sSupplierId);
            },

            _getSupplierData: function (sSupplierId) {
                const oModel = this.getView().getModel();
                const sPath = oModel.createKey("/ZI_MM_FORNECEDOR", { IdForn: sSupplierId });

                // Limpa os dados do fornecedor anterior enquanto o novo carrega
                this.getView().getModel("suppliersData").setData({});
                this.getView().setBusy(true);

                oModel.read(sPath, {
                    success: (oData) => {
                        // Copia para não alterar o objeto do cache do ODataModel
                        const oSupplier = { ...oData };

                        oSupplier.CNPJ = this.formatter.formatCNPJ(oSupplier.CNPJ);
                        oSupplier.Telefone = this.formatter.formatCelular(oSupplier.Telefone);

                        this.getView().getModel("suppliersData").setData(oSupplier);
                        this.getView().setBusy(false);

                        // Só abre o Dialog depois que os dados chegaram
                        this._openDialog();
                    },

                    error: (oError) => {
                        this.getView().setBusy(false);
                        MessageBox.error(this._getErrorMessage(oError, this._getText("supplierReadError")));
                    }
                });
            }
        });
    }
);
