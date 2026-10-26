sap.ui.define([], function () {
  "use strict";

  return {
    formatCargo: function (sCargo) {
      switch (sCargo) {
        case "1":
          return "Barista";
        case "2":
          return "Caixa";
        case "3":
          return "Gerente";
        case "4":
          return "Supervisor";
        case "5":
          return "Garçom";
        case "6":
          return "Cozinheiro";
        default:
          return sCargo;
      }
    },

    formatStatus: function (sStatus) {
      const oStatus = {
        A: "Ativo",
        I: "Inativo",
      };
      return oStatus[sStatus] || sStatus;
    },

    formatStatusState: function (sStatus) {
      switch (sStatus) {
        case "A":
          return "Success"; // Verde
        case "I":
          return "Error"; // Vermelho
        default:
          return "None";
      }
    },

    formatCategoria: function (sCategoria) {
      const oCategoria = {
        1: "Bebida Quente",
        2: "Bebida Fria",
        3: "Salgado",
        4: "Sobremesa",
        5: "Entrada",
      };
      return oCategoria[sCategoria] || sCategoria;
    },

    formatCNPJ: function (sCNPJ) {
      if (!sCNPJ) {
        return "";
      }

      const sValue = sCNPJ.toString().replace(/\D/g, ""); // Remove caracteres não numéricos

      if (sValue.length === 14) {
        return sValue.replace(
          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
          "$1.$2.$3/$4-$5",
        );
      }

      return sCNPJ;
    },

    formatCelular: function (sCelular) {

      if (!sCelular) {
        return "";
      }

      // Remove tudo o que não for número (limpa espaços, traços antigos, etc.)
      const sValue = sCelular.toString().replace(/\D/g, "");

      // Cenario 1 - Celular
      if (sValue.length === 11) {
        return sValue.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
      }

      // Cenario 2 - Telefone fixo
      if(sValue.length === 10){
        return sValue.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
      }

      return sCelular; // Retorna o valor original caso falte algum número
    },
  };
});
