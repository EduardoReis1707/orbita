# Login com Google e assinaturas

O código já está pronto. As etapas abaixo ativam os provedores nos respectivos painéis. Nenhuma chave deve ser enviada pelo chat ou incluída no Git.

## Login com Google

O login usa Supabase Auth como intermediário. Não precisa de Resend: Resend só seria útil mais tarde caso você queira trocar o provedor de e-mails de confirmação e recuperação de senha.

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um cliente OAuth do tipo **Aplicação da Web**.
2. Em **Authorized redirect URIs**, adicione `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`. O `SEU_PROJECT_REF` é o identificador do seu projeto Supabase.
3. Em **Authorized JavaScript origins**, adicione o domínio público do app e `http://localhost:3000` para desenvolvimento.
4. No Supabase, abra **Authentication → Providers → Google**, habilite o provedor e cole o Client ID e o Client Secret gerados no Google Cloud.
5. Em **Authentication → URL Configuration** no Supabase, defina a URL pública estável do app como Site URL e permita também `https://SEU_DOMINIO/auth/callback` e `http://localhost:3000/auth/callback` como Redirect URLs.

O botão aparece em Entrar e Criar conta. Ao voltar do Google, o app troca o código por uma sessão segura no servidor e direciona a pessoa para o onboarding ou para a página que ela tentava acessar.

## Stripe

O Stripe controla o checkout e o portal de assinatura. O webhook assinado é a única fonte que ativa ou remove o plano Pro no banco.

1. No [Stripe Dashboard](https://dashboard.stripe.com/), crie um Produto e um Preço recorrente mensal em reais. Copie o identificador `price_...`.
2. Ative o [Customer Portal](https://dashboard.stripe.com/settings/billing/portal), para que as pessoas possam atualizar cartão e cancelar a assinatura por conta própria.
3. Crie um endpoint de webhook para `https://SEU_DOMINIO/api/stripe/webhook` e selecione:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Nas variáveis de ambiente da Vercel, em Preview e Production, preencha:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRO_PRICE_ID`
   - `NEXT_PUBLIC_SITE_URL` com a URL estável correspondente ao ambiente
5. Para testes, use as chaves de teste do Stripe e o cartão `4242 4242 4242 4242`, com qualquer data futura e CVC válido. Troque por chaves de produção somente quando o checkout estiver validado.

Depois da configuração, a página **Configurações → Ver assinatura** abre o checkout para contas gratuitas e o portal Stripe para assinantes. O plano Pro só é aplicado após o webhook indicar uma assinatura `active` ou `trialing`.

## Referências oficiais

- [Supabase: login com Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase: signInWithOAuth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)
- [Stripe: assinaturas com Checkout](https://docs.stripe.com/billing/subscriptions/build-subscriptions?api-integration=checkout)
- [Stripe: webhooks de assinaturas](https://docs.stripe.com/billing/subscriptions/webhooks)
