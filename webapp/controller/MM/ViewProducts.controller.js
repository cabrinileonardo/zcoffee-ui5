sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "zcoffee/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/UIComponent"
  ],
  (
    Controller,
    formatter,
    Filter,
    FilterOperator,
    History,
    Fragment,
    JSONModel,
    MessageToast,
    MessageBox,
    UIComponent
  ) => {
    "use strict";

    return Controller.extend("zcoffee.controller.MM.ViewProducts", {
      formatter: formatter,

      onInit() {
        const oView = this.getView();

        this._oCustomStatus = this.byId("mcb_status");
        this._oCustomCategory = this.byId("mcb_category");
        this._oSmartTableProducts = this.byId("ProductsSmartTable");
        this._oSmartFilterBar = this.byId("SF_products");

        oView.setModel(
          new JSONModel(this._getCreateProductInitialData()),
          "createProduct",
        );
        oView.setModel(
          new JSONModel({
            isEditMode: false,
            dialogTitle: "",
          }),
          "dialogSettingsModel",
        );

        oView.setModel(
          new JSONModel({ items: this._getUnidades() }),
          "unidades",
        );

        this.getOwnerComponent()
          .getRouter()
          .getRoute("RouteProducts")
          .attachPatternMatched(this.onMatched.bind(this));
      },

      onMatched: function () {
        const dir = History.getInstance().getDirection();

        if (dir === "Backwards") {
          this._oSmartTableProducts.rebindTable();
        }
      },

      onResetFilter: function () {
        // clear() zera os campos proprios da SmartFilterBar (ID do produto), mas nao
        // mexe nos customControl - estes precisam ser resetados na mao.
        this._oSmartFilterBar.clear(); 

        this._oCustomStatus.setSelectedKeys(["A"]);
        this._oCustomCategory.setSelectedKeys([]);
        this._oSmartTableProducts.rebindTable();
      },

      onNavBack: function () {
        const sPreviousHash = History.getInstance().getPreviousHash();

        if (sPreviousHash) {
          window.history.go(-1);
        } else {
          this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
        }
      },

      onSmartFilterBarInitialise: function () {
        this._oCustomStatus.setSelectedKeys(["A"]);
      },

      onBeforeRebindTable: function (oEvent) {
        const mBindingParams = oEvent.getParameter("bindingParams");
        const aStatus = this._oCustomStatus.getSelectedKeys();
        const aCategory = this._oCustomCategory.getSelectedKeys();

        if (aStatus.length > 0) {
          const aFilters = [];

          aStatus.forEach(function (sStatus) {
            aFilters.push(
              new Filter({
                path: "Status",
                operator: FilterOperator.EQ,
                value1: sStatus,
              }),
            );
          });

          mBindingParams.filters.push(
            new Filter({
              filters: aFilters,
              and: false,
            }),
          );
        }

        if (aCategory.length > 0) {
          const aFilters = [];

          aCategory.forEach(function (sCategory) {
            aFilters.push(
              new Filter({
                path: "Categoria",
                operator: FilterOperator.EQ,
                value1: sCategory,
              }),
            );
          });

          mBindingParams.filters.push(
            new Filter({
              filters: aFilters,
              and: false,
            }),
          );
        }
      },

      onAddProduct: function () {
        this._resetCreateProductModel();

        this.getView().getModel("dialogSettingsModel").setData({
          isEditMode: false,
          dialogTitle: "Novo Produto",
          buttonText: "Criar",
        });

        this.onOpenProductDialog();
      },

      onOpenProductDialog: function () {
        if (!this._pCreateDialog) {
          this._pCreateDialog = Fragment.load({
            id: this.getView().getId(),
            name: "zcoffee.view.fragments.DialogProduct",
            controller: this,
          }).then((oDialog) => {
            this.getView().addDependent(oDialog);
            return oDialog;
          });
        }

        this._pCreateDialog.then((oDialog) => {
          oDialog.open();
        });
      },

      onSaveProduct: function () {
        const bEditMode = this.getView()
          .getModel("dialogSettingsModel")
          .getProperty("/isEditMode");

        if (bEditMode) {
          this._updateProduct();
        } else {
          this._createProduct();
        }
      },

      _montaPayload: function () {
        const oData = this.getView().getModel("createProduct").getData();

        return {
          Nome: oData.Nome,
          Descricao: oData.Descricao,
          Categoria: oData.Categoria,
          Preco: parseFloat(oData.Preco).toFixed(3),
          Moeda: oData.Moeda,
          Unidade: oData.Unidade,
          Status: oData.Status,
        };
      },

      _validarCampos: function (oData) {
        if (!oData.Nome) {
          MessageToast.show("Preencha o corretamente o Nome!");
          return false;
        }

        if (!oData.Preco || oData.Preco <= 0) {
          MessageToast.show("Preencha corretamente o Preço!");
          return false;
        }

        // "***" nao e uma unidade: e o que o SAP devolve quando nao consegue converter
        // a unidade de medida para o idioma da requisicao. Gravar isso destruiria o
        // valor original do produto.
        if (oData.Unidade === "***") {
          MessageBox.error(
            "A unidade deste produto não pôde ser convertida para o idioma atual " +
              "(o serviço retornou '***'). Salvar gravaria um valor inválido. " +
              "Abra o app em português ou corrija a unidade de medida no SAP.",
          );
          return false;
        }

        return true;
      },

      onCloseDialog: function () {
        this._resetCreateProductModel();
        this.byId("createProductDialog").close();
      },

      _getCreateProductInitialData: function () {
        return {
          Categoria: "1",
          Status: "A",
          Moeda: "BRL",
        };
      },

      // ATENCAO: Unidade vem do OData como representacao EXTERNA da unidade de medida
      // do SAP, que e DEPENDENTE DE IDIOMA - o mesmo produto retorna "PEC" em pt-BR,
      // "PC" em en-US e "ST" em de-DE, conforme o Accept-Language da requisicao.
      // Por isso esta lista fixa (em ingles, herdada do codigo original) nao serve como
      // fonte da verdade e nao deve ganhar valores de outros idiomas: o certo e o
      // servico expor a chave interna (MSEHI) ou um value help. Enquanto isso,
      // _garantirUnidade insere o que o backend devolveu, seja qual for o idioma.
      _getUnidades: function () {
        return [
          { key: "PC", text: "Unidade (PC)" },
          { key: "KG", text: "Quilograma (KG)" },
          { key: "G", text: "Grama (G)" },
          { key: "L", text: "Litro (L)" },
          { key: "ML", text: "Mililitro (ML)" },
        ];
      },

      // Sem isto, um produto cuja unidade nao esta na lista faz o Select cair no
      // primeiro item e gravar esse valor por cima do original, sem aviso. Vale para
      // unidade vazia, para idioma diferente do da lista e para "***", que e o que o
      // SAP devolve quando nao consegue converter a unidade para o idioma pedido.
      _garantirUnidade: function (sUnidade) {
        if (sUnidade === undefined || sUnidade === null) {
          return;
        }

        const oModel = this.getView().getModel("unidades");
        const aItems = oModel.getProperty("/items");

        if (aItems.some((o) => o.key === sUnidade)) {
          return;
        }

        aItems.push({
          key: sUnidade,
          text: sUnidade === "" ? "(sem unidade)" : sUnidade,
        });

        oModel.setProperty("/items", aItems);
      },

      _resetCreateProductModel: function () {
        this.getView()
          .getModel("createProduct")
          .setData(this._getCreateProductInitialData());
      },

      _createProduct: function () {
        const oModel = this.getView().getModel();
        const oPayload = this._montaPayload();

        if (!this._validarCampos(oPayload)) {
          return;
        }

        oModel.create("/ZI_MM_PRODUTO", oPayload, {
          success: function (oDataNew) {
            MessageBox.success(`Produto ${oDataNew.Id} criado com sucesso!`);

            this._resetCreateProductModel();
            this.byId("createProductDialog").close();
            this._oSmartTableProducts.rebindTable();
          }.bind(this),

          error: function (oError) {
            MessageBox.error("Falha ao criar Produto!");
          },
        });
      },

      _updateProduct: function () {
        const oModel = this.getView().getModel();
        const oData = this.getView().getModel("createProduct").getData();

        if (!this._validarCampos(oData)) {
          return;
        }

        oModel.update(`/ZI_MM_PRODUTO('${oData.Id}')`, oData, {
          success: function () {
            MessageBox.success(`Produto ${oData.Id} atualizado com sucesso!`);
            this._resetCreateProductModel();

            this.byId("createProductDialog").close();

            this._oSmartTableProducts.rebindTable();
          }.bind(this),

          error: function () {
            MessageBox.error("Erro ao atualizar o produto.");
          },
        });
      },

      onPrecoChange: function (oEvent) {
        const oInput = oEvent.getSource();
        let sValue = oInput.getValue();

        sValue = parseFloat(sValue.replace(",", "."));

        if (!isNaN(sValue)) {
          oInput.setValue(sValue.toFixed(2));
        }
      },

      onEdit: function (oEvent) {
        const oModel = this.getView().getModel();
        const sId = oEvent
          .getSource()
          .getBindingContext()
          .getPath()
          .split("'")[1];

        oModel.read(`/ZI_MM_PRODUTO('${sId}')`, {
          success: function (oData) {
            if (oData.Status !== "A") {
              MessageBox.warning("Somente produtos ativos podem ser editados.");
              return;
            }

            this._prepareEditModel(oData);

            this.getView().getModel("dialogSettingsModel").setData({
              isEditMode: true,
              dialogTitle: "Modificar Produto",
              buttonText: "Editar",
            });

            this.onOpenProductDialog();
          }.bind(this),

          error: function () {
            MessageBox.error("Erro ao carregar o produto.");
          },
        });
      },

      _prepareEditModel: function (oData) {
        this._garantirUnidade(oData.Unidade);

        this.getView()
          .getModel("createProduct")
          .setData({
            ...oData,
            Preco: parseFloat(oData.Preco).toFixed(2),
          });
      },

      onInativarProduto: function (oEvent) {
        this._alterarStatusProduto(oEvent, "I");
      },

      onReativarProduto: function (oEvent) {
        this._alterarStatusProduto(oEvent, "A");
      },

      _alterarStatusProduto: function (oEvent, sNovoStatus) {
        const sId = oEvent
          .getSource()
          .getBindingContext()
          .getPath()
          .split("'")[1];

        const bInativar = sNovoStatus === "I";

        const sAcao = bInativar ? "inativar" : "reativar";
        const sAcaoCapitalizada = bInativar ? "Inativação" : "Reativação";

        MessageBox.confirm(`Deseja ${sAcao} o Produto ${sId}?`, {
          title: `Confirmar ${sAcaoCapitalizada}`,
          actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.YES,

          onClose: (oAction) => {
            if (oAction === MessageBox.Action.YES) {
              this._updateStatusProduto(sId, sNovoStatus);
            }
          },
        });
      },

      _updateStatusProduto: function (sId, sNovoStatus) {
        const oModel = this.getView().getModel();

        oModel.update(
          `/ZI_MM_PRODUTO('${sId}')`,
          {
            Status: sNovoStatus,
          },
          {
            success: function () {
              const sMensagem =
                sNovoStatus === "I"
                  ? `Produto ${sId} inativado com sucesso!`
                  : `Produto ${sId} reativado com sucesso!`;

              MessageBox.success(sMensagem);

              oModel.refresh(true);
            }.bind(this),

            error: function () {
              const sAcao = sNovoStatus === "I" ? "inativar" : "reativar";

              MessageBox.error(`Falha ao ${sAcao} produto ${sId}.`);
            },
          },
        );
      },

      onItemPress: function (oEvent) {
        const sId = oEvent
          .getParameter("listItem")
          .getBindingContext()
          .getPath()
          .split("'")[1];

        const oRouter = UIComponent.getRouterFor(this);
        oRouter.navTo("RouteDetailProduct", {
          productId: sId,
        });
      },
    });
  },
);
